import { promisify } from 'node:util'
import { gunzip, gzip, constants as zlibConstants } from 'node:zlib'
import { Readable } from 'node:stream'
import { basename, join } from 'node:path'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { add, always, applySpec, compose, defaultTo, evolve, filter, head, identity, ifElse, isEmpty, isNotNil, map, omit, path, pathOr, pipe, prop, transduce } from 'ramda'
import { z } from 'zod'
import { LRUCache } from 'lru-cache'
import AsyncLock from 'async-lock'

import { isEarlierThan, isEqualTo, isJsonString, isLaterThan, maybeParseInt, parseTags } from '../utils.js'
import { processSchema } from '../model.js'
import { PROCESSES_TABLE, CHECKPOINTS_TABLE, COLLATION_SEQUENCE_MIN_CHAR } from './sqlite.js'
import { timer } from './metrics.js'

const gunzipP = promisify(gunzip)
const gzipP = promisify(gzip)

function pluckTagValue (name, tags) {
  const tag = tags.find((t) => t.name === name)
  return tag ? tag.value : undefined
}

function createCheckpointId ({ processId, timestamp, ordinate, cron }) {
  return `${[processId, timestamp, ordinate, cron].filter(isNotNil).join(',')}`
}
/**
 * Used to indicate we are interested in the latest cached
 * memory for the given process
 */
export const LATEST = 'LATEST'

/**
 * @type {{
 *  get: (processId: string) => { evaluation: Evaluation, File?: Promise<string | undefined>, Memory?: ArrayBuffer }
 *  set: (processId: string, value: { evaluation: Evaluation, Memory: ArrayBuffer }) => void
 *  data: {
 *    loadProcessCacheUsage: () => { size: number, calculatedSize: number, processes: { process: string, size: number }[]}
 *    forEach: (fn: (value: { evaluation: Evaluation, File?: Promise<string | undefined>, Memory?: ArrayBuffer }) => unknown) => void
 *  }
 * }}
 *
 * @typedef Evaluation
 * @prop {string} processId
 * @prop {string} moduleId
 * @prop {string} epoch
 * @prop {string} nonce
 * @prop {string} timestamp
 * @prop {number} blockHeight
 * @prop {string} ordinate
 * @prop {string} encoding
 * @prop {string} [cron]
 */
let processMemoryCache

/**
 * setTimeout is passed in as a dependency here because in a few instances such as TTL timeout, a value greater than the safe integer limit is used
 * which causes setTimeout to overflow and return immediately. Allowing the caller to pass in their own setTimeout function allows them to handle this
 * via passing in a new implementation such as using the 'long-timeout' library
 * This resolves issue #666
 */
export async function createProcessMemoryCache ({ MAX_SIZE, TTL, logger, gauge, writeProcessMemoryFile, setTimeout, clearTimeout }) {
  if (processMemoryCache) return processMemoryCache

  const clearTimerWith = (map) => (key) => {
    if (map.has(key)) {
      clearTimeout(map.get(key))
      map.delete(key)
    }
  }

  /**
   * Could not get TTL in this cache to work nicely with the
   * AoLoader overwriting apis like performance.now() and Date.now().
   *
   * So for now, we're handrolling ttl tracking by using setTimeout
   * and a vanilla Map
   */
  const ttlTimers = new Map()
  const clearTtlTimer = clearTimerWith(ttlTimers)

  function setTtl (key) {
    clearTtlTimer(key)

    const ttl = setTimeout(() => {
      /**
       * Calling delete on the LRUCache
       * will trigger the disposeAfter callback on the cache
       * to be called
       */
      lru.delete(key)
      ttlTimers.delete(key)
    }, TTL)
    ttl.unref()

    ttlTimers.set(key, ttl)
  }

  /**
   * @type {Map<string, DrainedCacheValue>}
   *
   * @typedef DrainedCacheValue
   * @property {Evaluation} evaluation
   * @property {Promise<string | undefined>} File
   */
  const drainedToFile = new Map()

  /**
   * Expose the total count of processes cached on this unit,
   * on the CU's application level metrics
   */
  gauge({
    name: 'ao_process_total',
    description: 'The total amount of ao Processes cached on the Compute Unit',
    labelNames: ['cache_type'],
    collect: (set) => {
      set(lru.size + drainedToFile.size)
      set(lru.size, { cache_type: 'memory' })
      set(drainedToFile.size, { cache_type: 'file' })
    }
  })

  /**
   * @type {LRUCache<string, LRUCacheValue}
   *
   * @typedef LRUCacheValue
   * @property {Evaluation} evaluation
   * @property {ArrayBuffer} Memory
   */
  const lru = new LRUCache({
    /**
     * #######################
     * Capacity Configuration
     * #######################
     */
    maxSize: MAX_SIZE,
    /**
     * Size is calculated using the Memory Array Buffer
     */
    sizeCalculation: ({ Memory }) => Memory.byteLength,
    /**
     * The process has either lived out its ttl, or has been evicted
     * from the cache.
     *
     * So we drain Process memory to a file, updating the cache entry
     * in the LRU In-Memory cache, but removing the process Memory from the heap,
     * clearing up space
     *
     * On a subsequent read, client may need to read the process memory back in from
     * a file
     */
    disposeAfter: async (value, key, reason) => {
      if (reason === 'delete' || reason === 'evict') {
        /**
         * In some way the Memory was removed or zeroed out
         *
         * There is no Memory, so nothing to preserve by writing
         * to a file, so simply noop, letting the cache entry
         * naturally be evicted (gone forever)
         *
         * This is basically a hedge against a defunct entry
         */
        if (!value.Memory || !value.Memory.byteLength) return

        /**
         * Add a cache entry to the drainedToFile cache with an entry containing a
         * file reference containing the process memory
         * and remove the reference to the actual Memory, so that it can be GC'd,
         * and freed up in the LRU Cache
         *
         * Since we are storing in an internal separate data store,
         * this won't have a ttl associated with it.
         *
         * Note we do not mutate the old object, and instead cache a new one,
         * in case the old object containing the memory is in use elsewhere
         *
         * Unlike 'dispose', It's safe to add back to the LRU Cache here (if needed). From lru-cache docs:
         * """
         *  It is safe to add an item right back into the cache at this point.
         * However, note that it is *very* easy to inadvertently create infinite
         * recursion this way.
         * """
         */
        logger('Draining memory of size %d for process "%s" to file...', value.Memory.byteLength, key)
        drainedToFile.set(
          key,
          {
            evaluation: value.evaluation,
            File: writeProcessMemoryFile({ Memory: value.Memory, evaluation: value.evaluation })
              .catch((err) => {
                logger(
                  'Error occurred when draining Memory for evaluation "%j" to a file. Skipping adding back to the cache...',
                  value.evaluation,
                  err
                )
                lru.delete(key)
                return undefined
              }),
            Memory: undefined
          })
      }
    }
  })
  processMemoryCache = {
    get: (key) => {
      /**
       * A value was in the LRU In-Memory Cache
       */
      if (lru.has(key)) {
        const value = lru.get(key)

        /**
         * Somehow the Memory buffer was zeroed out,
         * perhaps from a transfer to a worker thread gone wrong.
         *
         * Regardless, we cannot use the entry, so clear it's ttl timer
         * and implicitly delete the defunct entry from all caches,
         * internally
         *
         * This is basically a hedge against a defunct entry
         */
        if (value.Memory && !value.Memory.byteLength) {
          clearTtlTimer(key)
          lru.delete(key)
          drainedToFile.delete(key)
          return
        }

        /**
         * Will subsequently renew the age
         * and recency of the cached value
         */
        setTtl(key)
        return value
      }

      if (drainedToFile.has(key)) return drainedToFile.get(key)
    },
    set: (key, value) => {
      /**
       * The Memory is being added back to the LRU Cache,
       * so the drainedToFile entry needs to be removed
       */
      drainedToFile.delete(key)
      setTtl(key)
      return lru.set(key, value)
    },
    data: {
      loadProcessCacheUsage: () => {
        const lruSize = lru.size
        const drainedSize = drainedToFile.size
        const size = lruSize + drainedSize

        const lruCalcSize = lru.calculatedSize
        const drainedCalcSize = drainedToFile.size * 50
        const calculatedSize = lruCalcSize + drainedCalcSize

        const lruProcesses = lru.dump()
          .map(([key, entry]) => ({ process: key, size: entry.size }))
        const drainedProcesses = Array.from(drainedToFile.keys()).map((key) => ({ process: key, size: 50 }))
        const processes = lruProcesses.concat(drainedProcesses)

        return { size, calculatedSize, processes }
      },
      forEach: (fn) => {
        Array.from(lru.values()).forEach(fn)
        Array.from(drainedToFile.values()).forEach(fn)
      }
    }
  }

  return processMemoryCache
}

export function isProcessOwnerSupportedWith ({ ALLOW_OWNERS }) {
  const allowed = new Set(ALLOW_OWNERS)

  return async (id) => !allowed.size || allowed.has(id)
}

const processDocSchema = z.object({
  id: z.string().min(1),
  signature: processSchema.shape.signature,
  data: processSchema.shape.data,
  anchor: processSchema.shape.anchor,
  owner: processSchema.shape.owner,
  tags: processSchema.shape.tags,
  block: processSchema.shape.block
})

function latestCheckpointBefore (destination) {
  return (curLatest, checkpoint) => {
    /**
     * Often times, we are just interested in the latest checkpoint --
     * the latest point we can start evaluating from, up to the present.
     *
     * So we have a special case where instead of passing criteria
     * such as { timestamp, ordinate, cron } to serve as the right-most limit,
     * the caller can simply pass the string 'latest'.
     *
     * Our destination is the latest, so we should
     * just find the latest checkpoint
     */
    if (destination === LATEST) {
      if (!curLatest) return checkpoint
      return isEarlierThan(curLatest, checkpoint) ? curLatest : checkpoint
    }

    /**
     * We need to use our destination as the right-most (upper) limit
     * for our comparisons.
     *
     * In other words, we're only interested in checkpoints before
     * our destination
     */
    const { timestamp, ordinate, cron } = destination
    if (
      /**
       * checkpoint is later than the timestamp we're interested in,
       * so we cannot use it
       */
      isLaterThan({ timestamp, ordinate, cron }, checkpoint) ||
      /**
       * checkpoint is equal to evaluation what we're interested in,
       * so we can't use it, since we may need the evaluation's result
       */
      isEqualTo({ timestamp, ordinate, cron }, checkpoint) ||
      /**
       * The checkpoint is earlier than the latest checkpoint we've found so far,
       * and we're looking for the latest, so just ignore this checkpoint
       */
      (curLatest && isEarlierThan(curLatest, checkpoint))
    ) return curLatest

    /**
     * this checkpoint is the new latest we've come across
     */
    return checkpoint
  }
}

export function findProcessWith ({ db }) {
  function createQuery ({ processId }) {
    return {
      sql: `
        SELECT id, signature, data, anchor, owner, tags, block
        FROM ${PROCESSES_TABLE}
        WHERE
          id = ?;
      `,
      parameters: [processId]
    }
  }

  return ({ processId }) => of(processId)
    .chain(fromPromise((id) => db.query(createQuery({ processId: id }))))
    .map(defaultTo([]))
    .map(head)
    .chain((row) => row ? Resolved(row) : Rejected({ status: 404, message: 'Process not found' }))
    .chain((row) => {
      if (isJsonString(row.owner)) return Resolved(row)

      /**
       * owner contains the deprecated, pre-parsed value, so we need to self cleanup.
       * So implicitly delete the defunct record and Reject as if it was not found.
       *
       * It will then be up the client (in this case the business logic) to re-insert
       * the record with the proper format
       */
      return of({
        sql: `
          DELETE FROM ${PROCESSES_TABLE}
          WHERE
            id = ?;
        `,
        parameters: [processId]
      }).chain(fromPromise((query) => db.run(query)))
        .chain(() => Rejected({ status: 404, message: 'Process record invalid' }))
    })
    .map(evolve({
      tags: JSON.parse,
      block: JSON.parse,
      owner: JSON.parse
    }))
    .map(processDocSchema.parse)
    .map(applySpec({
      id: prop('id'),
      signature: prop('signature'),
      data: prop('data'),
      anchor: prop('anchor'),
      owner: prop('owner'),
      tags: prop('tags'),
      block: prop('block')
    }))
    .toPromise()
}

export function saveProcessWith ({ db }) {
  function createQuery (process) {
    return {
      sql: `
        INSERT OR IGNORE INTO ${PROCESSES_TABLE}
        (id, signature, data, anchor, owner, tags, block)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      parameters: [
        process.id,
        process.signature,
        process.data,
        process.anchor,
        JSON.stringify(process.owner),
        JSON.stringify(process.tags),
        JSON.stringify(process.block)
      ]
    }
  }
  return (process) => {
    return of(process)
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(processDocSchema.parse)
      .chain((doc) =>
        of(doc)
          .map(createQuery)
          .chain(fromPromise((query) => db.run(query)))
          .map(always(doc.id))
      )
      .toPromise()
  }
}

export function deleteProcessWith ({ db }) {
  function createQuery ({ processId }) {
    return {
      sql: `
        DELETE FROM ${PROCESSES_TABLE}
        WHERE
          id = ?;
      `,
      parameters: [processId]
    }
  }
  return ({ processId }) => of({ processId })
    .map(createQuery)
    .chain(fromPromise((query) => db.run(query)))
    .map(always(processId))
    .toPromise()
}

/**
 * ################################
 * #########  file utils ##########
 * ################################
 */

export function findCheckpointFileBeforeWith ({ DIR, glob }) {
  return ({ processId, before }) => {
    const { stop: stopTimer } = timer('findCheckpointFileBefore', { processId, before })
    /**
     * Find all the Checkpoint files for this process
     *
     * names like: eval-{processId},{timestamp},{ordinate},{cron}.json
     */
    return glob(join(DIR, `checkpoint-${processId}*.json`))
      .finally(stopTimer)
      .then((paths) =>
        paths.map(path => {
          const file = basename(path)
          const [processId, timestamp, ordinate, cron] = file
            .slice(11, -5) // remove prefix checkpoint- and suffix .json
            .split(',') // [processId, timestamp, ordinate, cron]

          return { file, processId, timestamp, ordinate, cron }
        })
      )
      /**
       * Find the latest Checkpoint before the params we are interested in
       */
      .then((parsed) => parsed.reduce(
        latestCheckpointBefore(before),
        undefined
      ))
  }
}

export function readCheckpointFileWith ({ DIR, readFile }) {
  return (name) => {
    const { stop: stopTimer } = timer('readCheckpointFile', { name })
    return readFile(join(DIR, name))
      .finally(stopTimer)
      .then((raw) => JSON.parse(raw))
  }
}

export function writeCheckpointFileWith ({ DIR, writeFile }) {
  return ({ Memory, evaluation }) => {
    const file = `checkpoint-${[evaluation.processId, evaluation.timestamp, evaluation.ordinate, evaluation.cron].join(',')}.json`
    const { stop: stopTimer } = timer('writeCheckpointFile', { file })
    const path = join(DIR, file)

    return writeFile(path, JSON.stringify({ Memory, evaluation }))
      .finally(stopTimer)
  }
}

/**
 * TODO: should we inject this lock?
 */
const lock = new AsyncLock()
export function readProcessMemoryFileWith ({ DIR, readFile }) {
  return (name) => {
    return lock.acquire(name, () => {
      const { stop: stopTimer } = timer('readProcessMemoryFile', { name })
      return readFile(join(DIR, name))
        .finally(stopTimer)
    })
  }
}

export function writeProcessMemoryFileWith ({ DIR, writeFile }) {
  return ({ Memory, evaluation }) => {
    const file = `state-${evaluation.processId}.dat`

    return lock.acquire(file, () => {
      const { stop: stopTimer } = timer('writeProcessMemoryFile', { file })
      const path = join(DIR, file)

      return writeFile(path, Memory)
        .then(() => file)
        .finally(stopTimer)
    })
  }
}

/**
 * ################################
 * #########  sqlite utils ##########
 * ################################
 */

export function findCheckpointRecordBeforeWith ({ db }) {
  function createQuery ({ processId, before }) {
    const timestamp = before === 'LATEST' ? new Date().getTime() : before.timestamp
    /** We are grabbing the most recent 5 checkpoints that occur after the before timestamp.
     * Generally, the most recent timestamp will be the best option (LIMIT 1).
     * However, in some cases, many checkpoints can share the same timestamps. If this is the case, we will have
     * to compare their crons, ordinates, etc (subsequent latestCheckpointBefore).
     * We choose 5 because we believe that it is a sufficiently
     * large enough set to ensure we include the correct checkpoint.
     */

    return {
      sql: `
        SELECT *
        FROM ${CHECKPOINTS_TABLE}
        WHERE
          processId = ? AND timestamp < ?
        ORDER BY timestamp DESC
        LIMIT 5;
      `,
      parameters: [processId, timestamp]
    }
  }

  return ({ processId, before }) => {
    /**
     * Find all the Checkpoint records for this process
     */
    return of({ processId, before })
      .chain((doc) => {
        return of(doc)
          .map(createQuery)
          .chain(fromPromise((query) => db.query(query)))
      })
      .map((results) => {
        return results.map((result) => ({ ...result, Memory: JSON.parse(pathOr({}, ['memory'])(result)), evaluation: JSON.parse(pathOr({}, ['evaluation'])(result)) }))
      })
      .map((parsed) => {
        return parsed.reduce(
          latestCheckpointBefore(before),
          undefined
        )
      })
      .toPromise()
  }
}

export function writeCheckpointRecordWith ({ db }) {
  const checkpointDocSchema = z.object({
    Memory: z.object({
      id: z.string().min(1),
      encoding: z.coerce.string().nullish()
    }),
    evaluation: z.object({
      processId: z.string().min(1),
      moduleId: z.string().min(1),
      timestamp: z.coerce.number(),
      epoch: z.coerce.number().nullish(),
      nonce: z.coerce.number().nullish(),
      blockHeight: z.coerce.number(),
      ordinate: z.coerce.string(),
      encoding: z.coerce.string().nullish(),
      cron: z.string().nullish()
    })
  })

  function createQuery ({ Memory, evaluation }) {
    return {
      sql: `
        INSERT OR IGNORE INTO ${CHECKPOINTS_TABLE}
        (id, processId, timestamp, ordinate, cron, memory, evaluation)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      parameters: [
        createCheckpointId(evaluation),
        evaluation.processId,
        evaluation.timestamp,
        evaluation.ordinate,
        evaluation.cron,
        JSON.stringify(Memory),
        JSON.stringify(evaluation)
      ]
    }
  }

  return ({ Memory, evaluation }) => {
    return of({ Memory, evaluation })
      .map(checkpointDocSchema.parse)
      .chain((doc) =>
        of(doc)
          .map(createQuery)
          .chain(fromPromise((query) => db.run(query)))
          .map(always(doc.id))
      )
      .toPromise()
  }
}

/**
 * ################################
 * ##### Checkpoint query utils ###
 * ################################
 */

function queryCheckpointsWith ({ queryGateway, queryCheckpointGateway, logger }) {
  queryGateway = fromPromise(queryGateway)
  queryCheckpointGateway = fromPromise(queryCheckpointGateway)

  return ({ query, variables, processId, before }) => {
    const queryCheckpoint = (gateway, name = 'gateway') => (attempt) => () => {
      const { stop: stopTimer } = timer('queryCheckpoint', { gateway: name, attempt, processId })

      return gateway({ query, variables })
        .bimap(
          (err) => {
            stopTimer()
            logger(
              'Error encountered querying %s for Checkpoint for process "%s", before "%j". Attempt %d...',
              name,
              processId,
              before,
              attempt,
              err
            )
            return variables
          },
          (res) => {
            stopTimer()
            return res
          }
        )
    }

    const queryOnDefaultGateway = queryCheckpoint(queryGateway)
    /**
     * Because the Checkpoint gateway is defaulted to the default gateway, if
     * no Checkpoint gateway is configured, this is effectively equivalent to
     * queryOnDefaultGateway.
     *
     * This means we maintain retry logic on default gateway
     */
    const queryOnCheckpointGateway = queryCheckpoint(queryCheckpointGateway, 'Checkpoint gateway')

    return of()
      .chain(queryOnDefaultGateway(1))
      /**
       * Retry the default gateway one more time
       */
      .bichain(queryOnDefaultGateway(2), Resolved)
      /**
       * Fallback to gateway configured specifically for Checkpoints.
       */
      .bichain(queryOnCheckpointGateway(3), Resolved)
  }
}

export function findLatestProcessMemoryWith ({
  cache,
  readProcessMemoryFile,
  findCheckpointFileBefore,
  readCheckpointFile,
  findCheckpointRecordBefore,
  address,
  queryGateway,
  queryCheckpointGateway,
  loadTransactionData,
  PROCESS_IGNORE_ARWEAVE_CHECKPOINTS,
  IGNORE_ARWEAVE_CHECKPOINTS,
  PROCESS_CHECKPOINT_TRUSTED_OWNERS,
  ALLOW_HISTORICAL_PROCESS_EVALUATIONS,
  logger: _logger
}) {
  const logger = _logger.child('ao-process:findLatestProcessMemory')
  readProcessMemoryFile = fromPromise(readProcessMemoryFile)
  address = fromPromise(address)
  findCheckpointFileBefore = fromPromise(findCheckpointFileBefore)
  readCheckpointFile = fromPromise(readCheckpointFile)
  loadTransactionData = fromPromise(loadTransactionData)
  findCheckpointRecordBefore = fromPromise(findCheckpointRecordBefore)

  const IGNORED_CHECKPOINTS = new Set(IGNORE_ARWEAVE_CHECKPOINTS)
  const isCheckpointIgnored = (id) => !!IGNORED_CHECKPOINTS.size && IGNORED_CHECKPOINTS.has(id)

  const queryCheckpoints = queryCheckpointsWith({ queryGateway, queryCheckpointGateway, logger })

  const GET_AO_PROCESS_CHECKPOINTS = `
    query GetAoProcessCheckpoints(
      $owners: [String!]!
      $processId: String!
      $limit: Int!
    ) {
      transactions(
        tags: [
          { name: "Process", values: [$processId] }
          { name: "Type", values: ["Checkpoint"] }
          { name: "Data-Protocol", values: ["ao"] }
        ],
        owners: $owners,
        first: $limit,
        sort: HEIGHT_DESC
      ) {
        edges {
          node {
            id
            owner {
              address
            }
            tags {
              name
              value
            }
          }
        }
      }
    }
  `

  /**
   * TODO: lots of room for optimization here
   */
  function determineLatestCheckpointBefore ({ edges, before }) {
    return transduce(
      compose(
        map(prop('node')),
        filter((node) => {
          const isIgnored = isCheckpointIgnored(node.id)
          if (isIgnored) logger('Encountered Ignored Checkpoint "%s" from Arweave. Skipping...', node.id)
          return !isIgnored
        }),
        map((node) => {
          const tags = parseTags(node.tags)
          return {
            id: node.id,
            timestamp: parseInt(tags.Timestamp),
            /**
             * Due to a previous bug, these tags may sometimes
             * be invalid values, so we've added a utility
             * to map those invalid values to a valid value
             */
            epoch: maybeParseInt(tags.Epoch),
            nonce: maybeParseInt(tags.Nonce),
            ordinate: tags.Nonce,
            module: tags.Module,
            blockHeight: parseInt(tags['Block-Height']),
            cron: tags['Cron-Interval'],
            encoding: tags['Content-Encoding']
          }
        })
      ),
      latestCheckpointBefore(before),
      undefined,
      edges
    )
  }

  function decodeData (encoding) {
    /**
     * TODO: add more encoding options
     */
    if (encoding && encoding !== 'gzip') {
      throw new Error('Only GZIP encoding is currently supported for Process Memory Snapshot')
    }

    return async (data) => {
      if (!encoding) return data

      return gunzipP(data)
    }
  }

  /**
   * @param {{ id, encoding }} checkpoint
   */
  function downloadCheckpointFromArweave (checkpoint) {
    const { stop: stopTimer } = timer('downloadCheckpointFromArweave', { id: checkpoint.id })

    return loadTransactionData(checkpoint.id)
      .map((res) => {
        stopTimer()
        return res
      })
      .chain(fromPromise((res) => res.arrayBuffer()))
      .map((arrayBuffer) => Buffer.from(arrayBuffer))
      /**
       * If the buffer is encoded, we need to decode it before continuing
       */
      .chain(fromPromise(decodeData(checkpoint.encoding)))
  }

  function maybeCached (args) {
    const { processId, omitMemory, before } = args

    const cacheKey = before === LATEST ? processId : `${processId}:${before.nonce}:${before.ordinate}:${before.timestamp}`
    return of(processId)
      .chain((processId) => {
        const cached = cache.get(cacheKey)

        /**
         * There is no cached memory, so keep looking
         */
        if (!cached) return Rejected(args)

        let file
        return of(cached)
          .chain((cached) => {
            if (omitMemory) return Resolved(null)

            return of(cached)
              .chain((cached) => {
                if (cached.Memory) return of(cached.Memory)
                /**
                 * The process memory was drained into a file,
                 * so we need to read it back in from the file
                 */
                if (cached.File) {
                  return of()
                    .chain(fromPromise(async () => cached.File))
                    .chain((maybeFile) => {
                      if (!maybeFile) return Rejected('No file path cached')

                      file = maybeFile
                      logger('Reloading cached process memory from file "%s"', file)
                      return readProcessMemoryFile(file)
                    })
                    .bichain(
                      (e) => {
                        logger('Error Encountered when reading process memory file for process "%s" from file "%s": "%s"', processId, file || 'path not found', e)
                        return Rejected(args)
                      },
                      Resolved
                    )
                }

                logger(
                  'Process cache entry error for process "%s". Entry contains neither Memory or File. Falling back to checkpoint record...',
                  processId
                )
                return Rejected(args)
              })
              /**
               * decode according to whatever encoding is being used to cache
               */
              .chain(fromPromise(decodeData(cached.evaluation.encoding)))
          })
          /**
           * Finally map the Checkpoint to the expected shape
           */
          .map((Memory) => ({
            src: 'memory',
            fromFile: file,
            Memory,
            moduleId: cached.evaluation.moduleId,
            timestamp: cached.evaluation.timestamp,
            blockHeight: cached.evaluation.blockHeight,
            epoch: cached.evaluation.epoch,
            nonce: cached.evaluation.nonce,
            ordinate: cached.evaluation.ordinate,
            cron: cached.evaluation.cron
          }))
      })
  }

  function maybeRecord (args) {
    const { processId, before, omitMemory } = args

    if (PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.includes(processId)) {
      logger('Arweave Checkpoints are ignored for process "%s". Not attempting to query file checkpoints...', processId)
      return Rejected(args)
    }

    /**
     * Attempt to find the relevant checkpoint in a file
     */
    return findCheckpointRecordBefore({ processId, before })
      .chain((latest) => {
        /**
         * No previously created checkpoint is cached in a file,
         * so keep looking
         */
        if (!latest) return Rejected(args)

        /**
         * We have found a previously created checkpoint, cached in a record, so
         * we can skip querying the gateway for it, and instead download the
         * checkpointed Memory directly, from arweave.
         *
         * The "record" checkpoint already contains all the metadata we would
         * otherwise have to pull from the gateway
         */
        return of(latest)
          // { Memory: { id, encoding }, evaluation }
          .chain((checkpoint) => {
            if (!isCheckpointIgnored(checkpoint.Memory.id)) return Resolved(checkpoint)
            logger('Encountered Ignored Checkpoint "%s" from file. Skipping...', checkpoint.Memory.id)
            return Rejected(args)
          })
          .chain((checkpoint) =>
            of(checkpoint.Memory)
              .chain((onArweave) => {
                if (omitMemory) return Resolved(null)
                return downloadCheckpointFromArweave(onArweave)
              })
              /**
               * Finally map the Checkpoint to the expected shape
               */
              .map((Memory) => ({
                src: 'record',
                Memory,
                moduleId: checkpoint.evaluation.moduleId,
                timestamp: checkpoint.evaluation.timestamp,
                epoch: checkpoint.evaluation.epoch,
                nonce: checkpoint.evaluation.nonce,
                ordinate: checkpoint.evaluation.ordinate,
                blockHeight: checkpoint.evaluation.blockHeight,
                cron: checkpoint.evaluation.cron
              }))
              .bimap(
                (err) => {
                  logger(
                    'Error encountered when downloading Checkpoint using cached file for process "%s", from Arweave, with parameters "%j"',
                    processId,
                    { checkpointTxId: checkpoint.id, ...checkpoint },
                    err
                  )
                  return args
                },
                identity
              )
          )
      })
  }

  function maybeCheckpointFromArweave (args) {
    const { processId, omitMemory, before } = args

    if (PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.includes(processId)) {
      logger('Arweave Checkpoints are ignored for process "%s". Not attempting to query gateway...', processId)
      return Rejected(args)
    }

    return of({ PROCESS_CHECKPOINT_TRUSTED_OWNERS })
      .chain(({ PROCESS_CHECKPOINT_TRUSTED_OWNERS }) => {
        if (isEmpty(PROCESS_CHECKPOINT_TRUSTED_OWNERS)) return address()
        return Resolved(PROCESS_CHECKPOINT_TRUSTED_OWNERS)
      })
      .map((owners) => ifElse(Array.isArray, always(owners), always([owners]))(owners))
      .chain((owners) => {
        return queryCheckpoints({
          query: GET_AO_PROCESS_CHECKPOINTS,
          variables: { owners, processId, limit: 50 },
          processId,
          before
        })
      })
      .map(path(['data', 'transactions', 'edges']))
      .map((edges) => determineLatestCheckpointBefore({ edges, before }))
      .chain((latestCheckpointBefore) => {
        if (!latestCheckpointBefore) return Rejected(args)

        /**
         * We have found a Checkpoint that we can use, so
         * now let's load the snapshotted Memory from arweave
         */
        return of()
          .chain(() => {
            if (omitMemory) return Resolved(null)
            return downloadCheckpointFromArweave(latestCheckpointBefore)
          })
          /**
           * Finally map the Checkpoint to the expected shape
           *
           * (see determineLatestCheckpointBefore)
           */
          .map((Memory) => ({
            src: 'arweave',
            Memory,
            moduleId: latestCheckpointBefore.module,
            timestamp: latestCheckpointBefore.timestamp,
            epoch: latestCheckpointBefore.epoch,
            nonce: latestCheckpointBefore.nonce,
            /**
             * Derived from Nonce on Checkpoint
             * (see determineLatestCheckpointBefore)
             */
            ordinate: latestCheckpointBefore.ordinate,
            blockHeight: latestCheckpointBefore.blockHeight,
            cron: latestCheckpointBefore.cron
          }))
          .bimap(
            (err) => {
              logger(
                'Error encountered when downloading Checkpoint found for process "%s", from Arweave, with parameters "%j"',
                processId,
                { checkpointTxId: latestCheckpointBefore.id, ...latestCheckpointBefore },
                err
              )
              return args
            },
            identity
          )
      })
  }

  function coldStart () {
    return Resolved({
      src: 'cold_start',
      Memory: null,
      moduleId: undefined,
      timestamp: undefined,
      epoch: undefined,
      nonce: undefined,
      blockHeight: undefined,
      cron: undefined,
      /**
       * No cached evaluation was found, but we still need an ordinate,
       * in case there are Cron messages to generate prior to any scheduled
       * messages existing in the sequence.
       *
       * The important attribute we need is for the ordinate to be lexicographically
       * sortable.
       *
       * So we use a very small unicode character, as a pseudo-ordinate, which gets
       * us exactly what we need
       */
      ordinate: COLLATION_SEQUENCE_MIN_CHAR
    })
  }

  function maybeOld ({ processId, before }) {
    return (found) => {
      /**
       * We only care about a COLD start if the message being evaluated
       * is not the first message (which will of course always start at the beginning)
       * So we only care to log a COLD start if there _should_ have been some memory
       * cached, and there wasn't.
       *
       * Otherwise, it's just business as usual -- evaluating a new process
       */
      if (found.src === 'cold_start') {
        if (before.ordinate > 0) {
          logger(
            '**COLD START**: Could not find a Checkpoint for process "%s" before parameters "%j". Initializing Cold Start...',
            processId,
            before
          )
        }

        /**
         * TODO: could we check the before.ordinate
         * and reject is the ordinate is sufficiently high,
         * which is to assume that it's checkpointed somewhere.
         *
         * For now, not doing this, since there could actually be long streams
         * of messages that have not been evaluated due to 'Cast'
         */

        return Resolved(found)
      }
      /**
       * The CU will only evaluate a new message it has not evaluated before,
       * which is to say the message's result is not in the CU's evaluation results cache
       * AND a later checkpoint is not found in the CU's process memory caches.
       *
       * So if we're not interested in the latest, we check if the found cached process memory
       * is later than "before" and Reject if so.
       *
       * See https://github.com/permaweb/ao/issues/667
       */
      if (before !== LATEST && isEarlierThan(found, before)) {
        logger(
          'OLD MESSAGE: Request for old message, sent to process "%s", with parameters "%j" when CU has found checkpoint with parameters "%j"',
          processId,
          before,
          omit(['Memory'], found)
        )
        return Rejected({ status: 425, ordinate: found.ordinate, message: 'no cached process memory found' })
      }

      logger(
        '%s CHECKPOINT: Found Checkpoint for process "%s" at "%j" before parameters "%j"',
        found.src.toUpperCase(),
        processId,
        omit(['Memory'], found),
        before
      )
      return Resolved(found)
    }
  }

  return ({ processId, timestamp, ordinate, cron, omitMemory = false }) => {
    /**
     * If no timestamp is provided, then we're actually interested in the
     * latest cached memory, so we make sure to set before to that flag used downstream
     */
    const before = timestamp ? { timestamp, ordinate, cron } : LATEST

    return of({ processId, before, omitMemory })
      .chain(maybeCached)
      .bichain(maybeRecord, Resolved)
      .bichain(maybeCheckpointFromArweave, Resolved)
      .bichain(coldStart, Resolved)
      .chain(ALLOW_HISTORICAL_PROCESS_EVALUATIONS ? maybeOld({ processId, before }) : Resolved) // conditionally chain maybeOld
      .toPromise()
  }
}

export function saveLatestProcessMemoryWith ({ cache, logger, saveCheckpoint, EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD }) {
  return async ({ processId, moduleId, messageId, timestamp, epoch, nonce, ordinate, cron, blockHeight, Memory, evalCount, gasUsed }) => {
    const cached = cache.get(processId)

    /**
     * Ensure that we are always caching a Buffer and not a TypedArray
     *
     * To avoid a copy, use the typed array's underlying ArrayBuffer to back
     * new Buffer, respecting the "view", i.e. byteOffset and byteLength
     */
    Memory = ArrayBuffer.isView(Memory)
      ? Buffer.from(Memory.buffer, Memory.byteOffset, Memory.byteLength)
      : Buffer.from(Memory)

    /**
     * Either no value was cached or the provided evaluation is later than
     * the value currently cached, so overwrite it
     */

    let incrementedGasUsed = pathOr(BigInt(0), ['evaluation', 'gasUsed'], cached)
    /**
     * The cache is being reseeded ie. Memory was reloaded from a file
     */
    if (cached && isEqualTo(cached.evaluation, { timestamp, ordinate, cron })) {
      /**
       * If Memory exists on the cache entry, then there is nothing to "reseed"
       * so do nothing
       */
      if (cached.Memory) return
    /**
     * The provided value is not later than the currently cached value,
     * so simply ignore it and return, keeping the current value in cache
     */
    } else if (cached && !isLaterThan(cached.evaluation, { timestamp, ordinate, cron })) {
      return
    } else {
      logger(
        'Caching latest memory for process "%s" with parameters "%j"',
        processId,
        { messageId, timestamp, ordinate, cron, blockHeight }
      )
      incrementedGasUsed = pipe(
        pathOr(BigInt(0), ['evaluation', 'gasUsed']),
        add(gasUsed || BigInt(0))
      )(cached)
    }

    const evaluation = {
      processId,
      moduleId,
      timestamp,
      epoch,
      nonce,
      blockHeight,
      ordinate,
      // encoding: 'gzip',
      /**
       * We cache the unencoded memory, as gzipping can become
       * slow given a large buffer with a lot of entropy
       *
       * NOTE: this consumes more memory in the LRU In-Memory Cache
       */
      encoding: undefined,
      cron,
      gasUsed: incrementedGasUsed < EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD ? incrementedGasUsed : 0
    }
    // cache.set(processId, { Memory: zipped, evaluation })
    cache.set(processId, { Memory, evaluation })

    /**
     *  @deprecated
     *  We are no longer creating checkpoints based on eval counts. Rather, we use a gas-based checkpoint system
    **/
    // if (!evalCount || !EAGER_CHECKPOINT_THRESHOLD || evalCount < EAGER_CHECKPOINT_THRESHOLD) return

    if (!incrementedGasUsed || !EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD || incrementedGasUsed < EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD) return
    /**
     * Eagerly create the Checkpoint on the next event queue drain
     */
    setImmediate(() => {
      logger(
        'Eager Checkpoint Accumulated Gas Threshold of "%d" gas used met when evaluating process "%s" up to "%j" -- "%d" gas used. Eagerly creating a Checkpoint...',
        EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD,
        processId,
        { messageId, timestamp, ordinate, cron, blockHeight },
        incrementedGasUsed
      )

      /**
       * Memory will always be defined at this point, so no reason
       * to pass File
       */
      return saveCheckpoint({ Memory, ...evaluation })
        .catch((err) => {
          logger(
            'Error occurred when creating Eager Checkpoint for evaluation "%j". Skipping...',
            evaluation,
            err
          )
        })
    })
  }
}

export function saveCheckpointWith ({
  readProcessMemoryFile,
  queryCheckpointGateway,
  queryGateway,
  hashWasmMemory,
  buildAndSignDataItem,
  uploadDataItem,
  address,
  writeCheckpointFile,
  writeCheckpointRecord,
  logger: _logger,
  PROCESS_CHECKPOINT_CREATION_THROTTLE,
  DISABLE_PROCESS_CHECKPOINT_CREATION,
  recentCheckpoints = new Map()
}) {
  readProcessMemoryFile = fromPromise(readProcessMemoryFile)
  address = fromPromise(address)
  hashWasmMemory = fromPromise(hashWasmMemory)
  buildAndSignDataItem = fromPromise(buildAndSignDataItem)
  uploadDataItem = fromPromise(uploadDataItem)
  writeCheckpointFile = fromPromise(writeCheckpointFile)
  writeCheckpointRecord = fromPromise(writeCheckpointRecord)

  const logger = _logger.child('ao-process:saveCheckpoint')

  const queryCheckpoints = queryCheckpointsWith({ queryGateway, queryCheckpointGateway, logger })

  /**
   * We will first query the gateway to determine if this CU
   * has already created a Checkpoint for this particular evaluation.
   *
   * Because cron is only specified for Cron Messages, we conditionally
   * include those bits in the operation based on withCron
   */
  const GET_AO_PROCESS_CHECKPOINTS = (withCron) => `
    query GetAoProcessCheckpoint(
      $owner: String!
      $processId: String!
      $timestamp: String!
      $nonce: String!
      ${withCron ? '$cron: String!' : ''}
    ) {
      transactions(
        tags: [
          { name: "Process", values: [$processId] }
          { name: "Nonce", values: [$nonce] }
          { name: "Timestamp", values: [$timestamp] }
          ${withCron ? '{ name: "Cron-Interval", values: [$cron] }' : ''}
          { name: "Type", values: ["Checkpoint"] }
          { name: "Data-Protocol", values: ["ao"] }
        ],
        owners: [$owner]
        first: 1
      ) {
        edges {
          node {
            id
            owner {
              address
            }
            tags {
              name
              value
            }
          }
        }
      }
    }
  `

  function createCheckpointDataItem (args) {
    const { moduleId, processId, epoch, nonce, ordinate, timestamp, blockHeight, cron, encoding, Memory, File } = args

    let file
    return of()
      .chain(() => {
        if (Memory) return of(Memory)
        if (File) {
          return of()
            .chain(fromPromise(async () => File))
            .chain((maybeFile) => {
              if (!maybeFile) return Rejected('no file path cached')

              file = maybeFile
              logger('Reloading cached process memory from file "%s"', file)
              return readProcessMemoryFile(file)
            })
            .bichain(
              (e) => {
                logger('Error Encountered when reading process memory file for process "%s" from file "%s": "%s"', processId, file || 'path not found', e)
                return Rejected(args)
              },
              Resolved
            )
        }

        logger(
          'Process cache entry error for evaluation "%j". Entry contains neither Memory or File. Skipping saving of checkpoint...',
          { moduleId, processId, epoch, nonce, timestamp, blockHeight, cron, encoding }
        )
        return Rejected('either File or Memory required')
      })
      .chain((buffer) =>
        of(buffer)
          .chain((buffer) => hashWasmMemory(Readable.from(buffer), encoding))
          .chain(fromPromise(async (sha) => {
            /**
             * TODO: what should we set anchor to?
             */
            const dataItem = {
              data: undefined,
              tags: [
                { name: 'Data-Protocol', value: 'ao' },
                { name: 'Variant', value: 'ao.TN.1' },
                { name: 'Type', value: 'Checkpoint' },
                { name: 'Module', value: moduleId.trim() },
                { name: 'Process', value: processId.trim() },
                /**
                 * Cron messages will not have a nonce but WILL
                 * have an ordinate equal to the most recent nonce
                 * (which is to say the nonce of the most recent Scheduled message)
                 */
                { name: 'Nonce', value: `${nonce || ordinate}`.trim() },
                { name: 'Timestamp', value: `${timestamp}`.trim() },
                { name: 'Block-Height', value: `${blockHeight}`.trim() },
                { name: 'Content-Type', value: 'application/octet-stream' },
                { name: 'SHA-256', value: sha },
                /**
                 * We will always upload Checkpoints to Arweave as
                 * gzipped encoded (see below)
                 */
                { name: 'Content-Encoding', value: 'gzip' }
              ]
            }

            /**
             * Cron messages do not have an Epoch,
             * so only add the tag if the value is present
             */
            if (epoch) dataItem.tags.push({ name: 'Epoch', value: `${epoch}`.trim() })

            if (cron) dataItem.tags.push({ name: 'Cron-Interval', value: cron })

            if (encoding === 'gzip') dataItem.data = buffer
            /**
             * Always ensure the process memory is encoded
             * before adding it as part of the data item
             */
            else dataItem.data = await gzipP(buffer, { level: zlibConstants.Z_BEST_COMPRESSION })

            return dataItem
          }))
      )
      .chain(buildAndSignDataItem)
  }

  const addRecentCheckpoint = (processId) => {
    /**
     * Shouldn't happen, since the entries clear themselves when their ttl
     * is reached, but just in case.
     */
    if (recentCheckpoints.has(processId)) clearTimeout(recentCheckpoints.get(processId))

    /**
     * Add a callback that will clear the recentCheckpoint
     * in the configured throttle ie. 24 hours
     *
     * We deref the timer, so the NodeJS process can successfully shutdown,
     * without waiting on the callback to be drained from the event queue.
     */
    const t = setTimeout(() => recentCheckpoints.delete(processId), PROCESS_CHECKPOINT_CREATION_THROTTLE)
    t.unref()
    recentCheckpoints.set(processId, t)
  }

  function maybeCheckpointDisabled (args) {
    const { processId } = args
    /**
     * Creating Checkpoints is enabled, so continue
     */
    if (!DISABLE_PROCESS_CHECKPOINT_CREATION) return Rejected(args)

    logger('Checkpoint creation is disabled on this CU, so no work needs to be done for process "%s"', processId)
    return Resolved()
  }

  function maybeRecentlyCheckpointed (args) {
    const { processId } = args
    /**
     * A Checkpoint has not been recently created for this process, so continue
     */
    if (!recentCheckpoints.has(processId)) return Rejected(args)

    logger('Checkpoint was recently created for process "%s", and so not creating another one.', processId)
    return Resolved()
  }

  function createCheckpoint (args) {
    const { Memory, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron } = args
    logger(
      'Checking Gateway for existing Checkpoint for evaluation: %j',
      { moduleId, processId, epoch, nonce, timestamp, blockHeight, cron, encoding }
    )

    return address()
      .chain((owner) => queryCheckpoints({
        query: GET_AO_PROCESS_CHECKPOINTS(!!cron),
        variables: {
          owner,
          processId,
          /**
           * Some messages do not have a nonce (Cron Messages),
           * but every message will have an ordinate set to the most recent nonce
           * (Scheduled Message ordinate is equal to its nonce)
           */
          nonce: `${nonce || ordinate}`,
          timestamp: `${timestamp}`,
          cron
        },
        processId,
        timestamp,
        ordinate,
        cron
      }))
      .map(path(['data', 'transactions', 'edges', '0']))
      .chain((checkpoint) => {
        if (checkpoint) {
          if (!Array.isArray(checkpoint.node.tags)) {
            // TODO: should probably use a Zod schema to verify 'queryCheckpoints' returns the data structure we expect
            return Rejected('expected checkpoint tags to be an array, cannot use checkpoint found on Arweave')
          }
          /**
           * This CU has already created a Checkpoint
           * for this evaluation so simply noop
           */
          return Resolved({ id: checkpoint.node.id, encoding: pluckTagValue('Content-Encoding', checkpoint.node.tags) })
        }

        logger(
          'Creating Checkpoint for evaluation: %j',
          { moduleId, processId, epoch, nonce, timestamp, blockHeight, cron, encoding: 'gzip' }
        )
        /**
         * Construct and sign an ao Checkpoint data item
         * and upload it to Arweave.
         */
        return createCheckpointDataItem(args)
          .chain((dataItem) => uploadDataItem(dataItem.data))
          .bimap(
            logger.tap('Failed to upload Checkpoint DataItem'),
            (res) => {
              logger(
                'Successfully uploaded Checkpoint DataItem for process "%s" on evaluation "%j"',
                processId,
                { checkpointTxId: res.id, processId, nonce, timestamp, cron, encoding: 'gzip' }
              )
              /**
               * Track that we've recently created a checkpoint for this
               * process, in case the CU attempts to create another one
               *
               * within the PROCESS_CHECKPOINT_CREATION_THROTTLE
               */
              addRecentCheckpoint(processId)

              /**
               * This CU will ALWAYS gzip encode checkpoints,
               * regardless of what was passed to saveCheckpoint.
               * (see createCheckpointDataItem)
               *
               * So we pass 'gzip' explicitly here.
               */
              return { id: res.id, encoding: 'gzip' }
            }
          )
      })
      .chain((onArweave) => {
        return writeCheckpointRecord({
          Memory: onArweave,
          evaluation: {
            processId,
            moduleId,
            timestamp,
            epoch,
            nonce,
            blockHeight,
            ordinate,
            encoding: onArweave.encoding,
            cron
          }
        })
          .bichain(
            (err) => {
              logger(
                'Encountered error when caching Checkpoint to file for process "%s" on evaluation "%j". Skipping...',
                processId,
                { checkpointTxId: Memory.id, processId, nonce, timestamp, cron },
                err
              )

              return Resolved()
            },
            Resolved
          )
          .map(() => onArweave)
      })
  }

  return async ({ Memory, File, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron }) => {
    return maybeCheckpointDisabled({ Memory, File, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron })
      .bichain(maybeRecentlyCheckpointed, Resolved)
      .bichain(createCheckpoint, Resolved)
      .toPromise()
  }
}

export function saveHistoricalProcessMemoryWith ({ cache, logger }) {
  return async ({ processId, timestamp, epoch, nonce, ordinate, cron, blockHeight, Memory, evalCount, gasUsed }) => {
    /**
     * If we are not allowing historical process evaluations, then we should save the process id to the cache at a specific location using the nonce, ordinate and timestamp.
     */
    const cached = cache.get(`${processId}:${nonce}:${ordinate}:${timestamp}`)
    if (cached) {
      /**
       * If Memory exists on the cache entry, then there is nothing to "reseed"
       * so do nothing
       */
      if (cached.Memory) return
    }

    // save it to the cache and return
    logger(
      'Caching historical memory for process "%s" with parameters "%j"',
      processId,
      { timestamp, ordinate, cron, blockHeight }
    )
    cache.set(`${processId}:${nonce}:${ordinate}:${timestamp}`, { Memory, evaluation: { processId, timestamp, epoch, nonce, blockHeight, ordinate, cron, gasUsed } })
  }
}
