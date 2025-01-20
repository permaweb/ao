import { promisify } from 'node:util'
import { gunzip, gzip, constants as zlibConstants } from 'node:zlib'
import { Readable } from 'node:stream'
import { join } from 'node:path'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { add, always, applySpec, compose, defaultTo, evolve, filter, head, identity, ifElse, isEmpty, isNotNil, map, omit, path, pathOr, pipe, prop, transduce } from 'ramda'
import { z } from 'zod'
import { LRUCache } from 'lru-cache'
import AsyncLock from 'async-lock'

import { isEarlierThan, isEqualTo, isJsonString, isLaterThan, maybeParseInt, parseTags } from '../domain/utils.js'
import { processSchema } from '../domain/model.js'
import { PROCESSES_TABLE, CHECKPOINTS_TABLE, CHECKPOINT_FILES_TABLE, COLLATION_SEQUENCE_MIN_CHAR } from './db.js'
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
const createFileCheckpointId = createCheckpointId
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
 * @prop {string} assignmentId
 * @prop {string} hashChain
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
          }
        )
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
       * So implictly delete the defunct record and Reject as if it was not found.
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
       * The data for the process could be very large, so we do not persist
       * it, and instead hydrate it on the process message later, if needed.
       */
      .map(evolve({
        data: () => null
      }))
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

export function writeProcessMemoryFileWith ({ DIR, writeFile, renameFile, mkdir }) {
  return ({ Memory, evaluation }) => {
    const dest = `state-${evaluation.processId}.dat`
    const tmp = `${dest}.tmp`

    return lock.acquire(dest, () => {
      const { stop: stopTimer } = timer('writeProcessMemoryFile', { file: tmp })

      const tmpPath = join(DIR, tmp)
      const destPath = join(DIR, dest)
      /**
       * By first writing to a temp file, we prevent corrupting a previous file checkpoint
       * if for whatever reason the writing is not successful ie. node process is terminated
       *
       * Then we rename the tmp to the dest file, effectively overwriting it, atomically.
       */
      return mkdir(DIR, { recursive: true })
        .then(() => writeFile(tmpPath, Memory))
        .then(() => renameFile(tmpPath, destPath))
        .then(() => dest)
        .finally(stopTimer)
    })
  }
}

/**
 * ################################
 * #########  sqlite utils ##########
 * ################################
 */

export function findRecordCheckpointBeforeWith ({ db }) {
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
          "processId" = ? AND timestamp < ?
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
      /**
       * nullish for backwards compat
       */
      assignmentId: z.string().nullish(),
      /**
       * nullish for backwards compat
       */
      hashChain: z.string().nullish(),
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
        (id, "processId", timestamp, ordinate, cron, memory, evaluation)
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
 * Query the checkpoint files table in the database
 * for a file path containing a process checkpoint
 */
export function findFileCheckpointBeforeWith ({ db }) {
  function createQuery ({ processId }) {
    /**
     * Query the sqlite database for our file with the process checkpoint.
     * Because we are using the process ID as a primary key,
     * this will only produce one result.
     */

    return {
      sql: `
        SELECT *
        FROM ${CHECKPOINT_FILES_TABLE}
        WHERE "processId" = ?;
      `,
      parameters: [processId]
    }
  }
  return ({ processId, before }) => {
    /**
     * Find the Checkpoint file for this process
     */
    return of({ processId, before })
      .chain((doc) =>
        of(doc)
          .map(createQuery)
          .chain(fromPromise((query) => db.query(query)))
      )
      .map((fileCheckpoints) => {
        return fileCheckpoints.map((fileCheckpoint) => ({
          ...fileCheckpoint,
          file: pathOr('', ['file'])(fileCheckpoint),
          evaluation: JSON.parse(pathOr({}, ['evaluation'])(fileCheckpoint))
        }))
      })
      .map((parsed) => {
        /**
         * If the checkpoint evaluation is too early, we return undefined
         */
        return parsed.reduce(
          (acc, checkpoint) => latestCheckpointBefore(before)(acc, { ...checkpoint.evaluation, file: checkpoint.file }),
          undefined
        )
      })
      .toPromise()
  }
}

/**
 * Write to the database of checkpoint file paths.
 * with the updated evaluation and path.
 */
export function writeFileCheckpointRecordWith ({ db }) {
  const checkpointFilesDocSchema = z.object({
    file: z.string().min(1),
    evaluation: z.object({
      processId: z.string().min(1),
      moduleId: z.string().min(1),
      assignmentId: z.string().nullish(),
      hashChain: z.string().nullish(),
      timestamp: z.coerce.number(),
      epoch: z.coerce.number().nullish(),
      nonce: z.coerce.number().nullish(),
      blockHeight: z.coerce.number(),
      ordinate: z.coerce.string(),
      encoding: z.coerce.string().nullish(),
      cron: z.string().nullish()
    })
  })

  function createQuery ({ file, evaluation }) {
    /**
     * We use 'insert or replace' to ensure we are keeping processIds unique.
     */
    return {
      sql: `
        INSERT OR REPLACE INTO ${CHECKPOINT_FILES_TABLE}
        (id, "processId", timestamp, ordinate, cron, file, evaluation, "cachedAt")
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      parameters: [
        createFileCheckpointId(evaluation),
        evaluation.processId,
        evaluation.timestamp,
        evaluation.ordinate,
        evaluation.cron,
        file,
        JSON.stringify(evaluation),
        new Date().getTime()
      ]
    }
  }

  return (evaluation, file) => {
    return of({ file, evaluation })
      .map(checkpointFilesDocSchema.parse)
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
  readFileCheckpointMemory,
  findFileCheckpointBefore,
  findRecordCheckpointBefore,
  address,
  queryGateway,
  queryCheckpointGateway,
  loadTransactionData,
  PROCESS_IGNORE_ARWEAVE_CHECKPOINTS,
  IGNORE_ARWEAVE_CHECKPOINTS,
  PROCESS_CHECKPOINT_TRUSTED_OWNERS,
  logger: _logger
}) {
  const logger = _logger.child('ao-process:findLatestProcessMemory')
  readProcessMemoryFile = fromPromise(readProcessMemoryFile)
  readFileCheckpointMemory = fromPromise(readFileCheckpointMemory)
  address = fromPromise(address)
  findFileCheckpointBefore = fromPromise(findFileCheckpointBefore)
  loadTransactionData = fromPromise(loadTransactionData)
  findRecordCheckpointBefore = fromPromise(findRecordCheckpointBefore)

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
  function determineLatestCheckpoint (edges) {
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
            assignmentId: tags.Assignment,
            hashChain: tags['Hash-Chain'],
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
      /**
       * Pass the LATEST flag, which configures latestCheckpointBefore
       * to only be concerned with finding the absolute latest checkpoint
       * in the list
       */
      latestCheckpointBefore(LATEST),
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
    const { processId, omitMemory } = args

    return of(processId)
      .chain((processId) => {
        const cached = cache.get(processId)

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
            assignmentId: cached.evaluation.assignmentId,
            hashChain: cached.evaluation.hashChain,
            timestamp: cached.evaluation.timestamp,
            blockHeight: cached.evaluation.blockHeight,
            epoch: cached.evaluation.epoch,
            nonce: cached.evaluation.nonce,
            ordinate: cached.evaluation.ordinate,
            cron: cached.evaluation.cron
          }))
      })
  }

  /**
   * Check if there is a process checkpoint stored on the filesystem.
   *
   * First, we query the db to check whether a file checkpoint record is stored for this process.
   * If so, we ensure the file exists and then read the file to obtain the process memory.
   */
  function maybeFile (args) {
    const { processId, omitMemory } = args
    /**
     * Attempt to find the latest checkpoint in a file
     */
    return findFileCheckpointBefore({ processId, before: LATEST })
      .chain((checkpoint) => {
        /**
         * No previously created checkpoint is cached in a file,
         * so keep looking
         */
        if (!checkpoint) return Rejected(args)

        /**
         * We have found a previously created checkpoint, cached in a record, so
         * we can skip querying the gateway for it, and instead load the
         * checkpointed Memory directly, from the file system.
         *
         * The "record" checkpoint already contains all the metadata we would
         * otherwise have to pull from the gateway
         */
        return of(checkpoint)
          .chain((checkpoint) => {
            if (omitMemory) return Resolved(null)
            return of()
              .chain(fromPromise(async () => checkpoint.file))
              .chain((file) => {
                if (!file) return Rejected(args)
                return readFileCheckpointMemory(file)
              })
              .bichain(
                (e) => {
                  logger('Error Encountered when reading process memory file for process "%s" from file "%s": "%s"', args.processId, checkpoint.file, e.message)
                  return Rejected(args)
                },
                Resolved
              )
          })
          .map((Memory) => ({
            src: 'file',
            Memory,
            moduleId: checkpoint.moduleId,
            assignmentId: checkpoint.assignmentId,
            hashChain: checkpoint.hashChain,
            timestamp: checkpoint.timestamp,
            blockHeight: checkpoint.blockHeight,
            epoch: checkpoint.epoch,
            nonce: checkpoint.nonce,
            ordinate: checkpoint.ordinate,
            cron: checkpoint.cron
          }))
      })
  }

  function maybeRecord (args) {
    const { processId, omitMemory } = args

    if (PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.includes(processId)) {
      logger('Arweave Checkpoints are ignored for process "%s". Not attempting to query file checkpoints...', processId)
      return Rejected(args)
    }

    /**
     * Attempt to find the latest checkpoint in a file
     */
    return findRecordCheckpointBefore({ processId, before: LATEST })
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
                assignmentId: checkpoint.evaluation.assignmentId,
                hashChain: checkpoint.evaluation.hashChain,
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
    const { processId, omitMemory } = args

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
          before: LATEST
        })
      })
      .map(path(['data', 'transactions', 'edges']))
      .map(determineLatestCheckpoint)
      .chain((latestCheckpoint) => {
        if (!latestCheckpoint) return Rejected(args)

        /**
         * We have found a Checkpoint that we can use, so
         * now let's load the snapshotted Memory from arweave
         */
        return of()
          .chain(() => {
            if (omitMemory) return Resolved(null)
            return downloadCheckpointFromArweave(latestCheckpoint)
          })
          /**
           * Finally map the Checkpoint to the expected shape
           *
           * (see determineLatestCheckpointBefore)
           */
          .map((Memory) => ({
            src: 'arweave',
            Memory,
            moduleId: latestCheckpoint.module,
            assignmentId: latestCheckpoint.assignmentId,
            hashChain: latestCheckpoint.hashChain,
            timestamp: latestCheckpoint.timestamp,
            epoch: latestCheckpoint.epoch,
            nonce: latestCheckpoint.nonce,
            /**
             * Derived from Nonce on Checkpoint
             * (see determineLatestCheckpointBefore)
             */
            ordinate: latestCheckpoint.ordinate,
            blockHeight: latestCheckpoint.blockHeight,
            cron: latestCheckpoint.cron
          }))
          .bimap(
            (err) => {
              logger(
                'Error encountered when downloading Checkpoint found for process "%s", from Arweave, with parameters "%j"',
                processId,
                { checkpointTxId: latestCheckpoint.id, ...latestCheckpoint },
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
      assignmentId: undefined,
      hashChain: undefined,
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
      if (
        before !== LATEST &&
        isEarlierThan(found, before)
      ) {
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
      .bichain(maybeFile, Resolved)
      .bichain(maybeRecord, Resolved)
      .bichain(maybeCheckpointFromArweave, Resolved)
      .bichain(coldStart, Resolved)
      .chain(maybeOld({ processId, before }))
      .toPromise()
  }
}

export function saveLatestProcessMemoryWith ({ cache, logger, saveCheckpoint, EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD }) {
  return async ({ processId, moduleId, assignmentId, messageId, hashChain, timestamp, epoch, nonce, ordinate, cron, blockHeight, Memory, gasUsed }) => {
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
      assignmentId,
      hashChain,
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
  writeCheckpointRecord,
  writeFileCheckpointMemory,
  writeFileCheckpointRecord,
  logger: _logger,
  PROCESS_CHECKPOINT_CREATION_THROTTLE,
  DISABLE_PROCESS_CHECKPOINT_CREATION,
  DISABLE_PROCESS_FILE_CHECKPOINT_CREATION,
  recentCheckpoints = new Map()
}) {
  readProcessMemoryFile = fromPromise(readProcessMemoryFile)
  address = fromPromise(address)
  hashWasmMemory = fromPromise(hashWasmMemory)
  buildAndSignDataItem = fromPromise(buildAndSignDataItem)
  uploadDataItem = fromPromise(uploadDataItem)
  writeCheckpointRecord = fromPromise(writeCheckpointRecord)
  writeFileCheckpointMemory = fromPromise(writeFileCheckpointMemory)
  writeFileCheckpointRecord = fromPromise(writeFileCheckpointRecord)

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
    const { moduleId, processId, assignmentId, hashChain, epoch, nonce, ordinate, timestamp, blockHeight, cron, encoding, Memory } = args

    return of(Memory)
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
             * A Cron message does not have an assignment
             * (which is to say this is the assignment of the most recent
             * Scheduled message)
             *
             * This is needed in order to perform hash chain verification
             * on hot starts from a checkpoint
             */
            if (assignmentId) dataItem.tags.push({ name: 'Assignment', value: assignmentId.trim() })
            /**
             * A Cron message does not have a hashChain
             * (which is to say this is the hashChain of the most recent
             * Scheduled message)
             *
             * This is needed in order to perform hash chain verification
             * on hot starts from a checkpoint
             */
            if (hashChain) dataItem.tags.push({ name: 'Hash-Chain', value: hashChain.trim() })

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

  const addRecentArweaveCheckpoint = (processId) => {
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

  function maybeHydrateMemory (args) {
    /**
     * Do nothing and let subsequent steps disable themselves
     */
    if (DISABLE_PROCESS_FILE_CHECKPOINT_CREATION && DISABLE_PROCESS_CHECKPOINT_CREATION) return Resolved(args)

    const { moduleId, processId, assignmentId, hashChain, epoch, nonce, timestamp, blockHeight, cron, encoding, Memory, File } = args

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
                return Rejected('could not read process memory from file')
              },
              Resolved
            )
        }

        logger(
          'Process cache entry error for evaluation "%j". Entry contains neither Memory or File. Skipping saving of checkpoint...',
          { moduleId, processId, assignmentId, hashChain, epoch, nonce, timestamp, blockHeight, cron, encoding }
        )
        return Rejected('either File or Memory required')
      })
      .map((Memory) => ({ ...args, Memory }))
  }

  function createFileCheckpoint (args) {
    const { Memory, encoding, processId, moduleId, assignmentId, hashChain, timestamp, epoch, ordinate, nonce, blockHeight, cron } = args

    if (DISABLE_PROCESS_FILE_CHECKPOINT_CREATION) return Rejected('file checkpoint creation is disabled')
    /**
     * If we have no Memory, there is nothing to drain to a file.
     * If this is the case, we will skip this step and no checkpoint will be saved.
     */
    if (!Memory) return Rejected('No process memory to checkpoint to a file...')

    const evaluation = {
      processId,
      moduleId,
      assignmentId,
      hashChain,
      timestamp,
      nonce,
      ordinate,
      epoch,
      blockHeight,
      cron,
      encoding
    }

    return of({ Memory, evaluation })
      .chain(writeFileCheckpointMemory)
      .chain((file) =>
        writeFileCheckpointRecord(evaluation, file)
          .map(() => {
            logger(
              'Successfully created file checkpoint for process "%s" on evaluation "%j"',
              processId,
              { file, processId, assignmentId, hashChain, nonce, timestamp, cron }
            )
            return { file, ...evaluation }
          })
      )
  }

  function createArweaveCheckpoint (args) {
    const { encoding, processId, moduleId, assignmentId, hashChain, timestamp, epoch, ordinate, nonce, blockHeight, cron } = args

    if (DISABLE_PROCESS_CHECKPOINT_CREATION) return Rejected('arweave checkpoint creation is disabled')
    /**
     * A Checkpoint has been recently created for this process
     */
    if (recentCheckpoints.has(processId)) return Rejected('arweave checkpoint recently created, and so not creating another one')

    logger(
      'Checking Gateway for existing Checkpoint for evaluation: %j',
      { moduleId, processId, assignmentId, hashChain, epoch, nonce, timestamp, blockHeight, cron, encoding }
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

          logger('Skipping creation of arweave checkpoint for process "%s" due to checkpoint already: %j',
            args.processId,
            { checkpointTxId: checkpoint.node.id }
          )
          /**
           * This CU has already created a Checkpoint
           * for this evaluation so simply noop
           */
          return Resolved({ id: checkpoint.node.id, encoding: pluckTagValue('Content-Encoding', checkpoint.node.tags) })
        }

        logger(
          'Creating Checkpoint for evaluation: %j',
          { moduleId, processId, assignmentId, hashChain, epoch, nonce, timestamp, blockHeight, cron, encoding: 'gzip' }
        )

        /**
         * Construct and sign an ao Checkpoint data item
         * and upload it to Arweave.
         */
        return createCheckpointDataItem(args)
          .chain((dataItem) => uploadDataItem(dataItem.data))
          .bimap(
            logger.tap('Failed to upload Checkpoint DataItem, %O'),
            (res) => {
              logger(
                'Successfully uploaded Checkpoint DataItem for process "%s" on evaluation "%j"',
                processId,
                { checkpointTxId: res.id, processId, assignmentId, hashChain, nonce, timestamp, cron, encoding: 'gzip' }
              )
              /**
               * Track that we've recently created a checkpoint for this
               * process, in case the CU attempts to create another one
               *
               * within the PROCESS_CHECKPOINT_CREATION_THROTTLE
               */
              addRecentArweaveCheckpoint(processId)

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
      /**
       * Whether determined to already exist on Arweave, or a
       * new checkpoint was created and uploaded, we want to always
       * cache a record that points directly to the checkpoint on Arweave.
       *
       * This helps mitigate the need to query a gateway to find a valid checkpoint
       */
      .chain((ctx) => {
        return writeCheckpointRecord({
          Memory: ctx,
          evaluation: {
            processId,
            moduleId,
            assignmentId,
            hashChain,
            timestamp,
            epoch,
            nonce,
            blockHeight,
            ordinate,
            encoding: ctx.encoding,
            cron
          }
        })
          .bichain(
            (err) => {
              logger(
                'Encountered error when caching arweave checkpoint tx id for process "%s" on evaluation "%j". Skipping...',
                processId,
                { checkpointTxId: ctx.id, processId, nonce, timestamp, cron },
                err
              )

              return Resolved()
            },
            Resolved
          )
          .map(() => ctx)
      })
  }

  function createCheckpoints (args) {
    return of(args)
      .chain(fromPromise((args) =>
        Promise.all([
          createFileCheckpoint(args)
            .bichain(
              (err) => {
                logger('Skipping creation of file checkpoint for process "%s" due to: %O', args.processId, err)
                return Resolved()
              },
              Resolved
            )
            .toPromise(),
          createArweaveCheckpoint(args)
            .bichain(
              (err) => {
                logger('Skipping creationg of arweave checkpoint for process "%s" due to: %O', args.processId, err)
                return Resolved()
              },
              Resolved
            )
            .toPromise()
        ])
      ))
  }

  return async ({
    Memory,
    File,
    encoding,
    processId,
    moduleId,
    assignmentId,
    hashChain,
    timestamp,
    epoch,
    ordinate,
    nonce,
    blockHeight,
    cron
  }) =>
    maybeHydrateMemory({
      Memory,
      File,
      encoding,
      processId,
      assignmentId,
      hashChain,
      moduleId,
      timestamp,
      epoch,
      ordinate,
      nonce,
      blockHeight,
      cron
    })
      .chain(createCheckpoints)
      .toPromise()
}
