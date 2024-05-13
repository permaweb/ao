import { promisify } from 'node:util'
import { gunzip, gzip, constants as zlibConstants } from 'node:zlib'
import { Readable } from 'node:stream'
import { basename, join } from 'node:path'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, compose, defaultTo, evolve, head, identity, map, omit, path, prop, transduce } from 'ramda'
import { z } from 'zod'
import { LRUCache } from 'lru-cache'

import { isEarlierThan, isEqualTo, isLaterThan, parseTags } from '../utils.js'
import { processSchema } from '../model.js'
import { PROCESSES_TABLE, COLLATION_SEQUENCE_MIN_CHAR } from './sqlite.js'
import { timer } from './metrics.js'

const gunzipP = promisify(gunzip)
const gzipP = promisify(gzip)

function pluckTagValue (name, tags) {
  const tag = tags.find((t) => t.name === name)
  return tag ? tag.value : undefined
}

/**
 * Used to indicate we are interested in the latest cached
 * memory for the given process
 */
export const LATEST = 'LATEST'

/**
 * @type {{
 *  get: LRUCache<string, { evaluation: Evaluation, File?: string, Memory?: ArrayBuffer }>['get']
 *  set: LRUCache<string, { evaluation: Evaluation, File?: string, Memory?: ArrayBuffer }>['set']
 *  lru: LRUCache<string, { evaluation: Evaluation, File?: string, Memory?: ArrayBuffer }>
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
export async function createProcessMemoryCache ({ MAX_SIZE, TTL, DRAIN_TO_FILE_THRESHOLD, onEviction, writeProcessMemoryFile }) {
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

  const drainToFileTimers = new Map()
  const clearDrainToFileTimer = clearTimerWith(drainToFileTimers)

  /**
   * @type {LRUCache<string, { evaluation: Evaluation, File?: string, Memory?: ArrayBuffer }}
   */
  const data = new LRUCache({
    /**
     * #######################
     * Capacity Configuration
     * #######################
     */
    maxSize: MAX_SIZE,
    /**
     * Size is calculated using the Memory Array Buffer
     * or just the name of the file (negligible in the File case)
     */
    sizeCalculation: ({ Memory, File }) => {
      if (Memory) return Memory.byteLength
      return File.length
    },
    noDisposeOnSet: true,
    disposeAfter: (value, key, reason) => {
      if (reason === 'set') return

      clearTtlTimer(key)
      onEviction({ key, value })
    }
  })
  processMemoryCache = {
    get: (key) => {
      if (!data.has(key)) return undefined

      /**
       * Will subsequently renew the age
       * and recency of the cached value
       */
      const value = data.get(key)
      processMemoryCache.set(key, value)

      return value
    },
    set: (key, value) => {
      clearTtlTimer(key)
      /**
       * Calling delete will trigger the disposeAfter callback on the cache
       * to be called
       */
      const ttl = setTimeout(() => {
        data.delete(key)
        ttlTimers.delete(key)
      }, TTL).unref()

      ttlTimers.set(key, ttl)

      /**
       * Set up timer to drain Process memory to a file, if not accessed
       * within the DRAIN_TO_FILE period ie. 30 seconds
       *
       * This keeps the cache entry in the LRU In-Memory cache, but removes
       * the process Memory from the heap, clearing up space
       *
       * On subsequent read, client may need to read the memory back in from
       * a file
       */
      if (value.Memory && DRAIN_TO_FILE_THRESHOLD) {
        clearDrainToFileTimer(key)
        const drainToFile = setTimeout(async () => {
          const file = await writeProcessMemoryFile(value)
          /**
           * Update the cache entry with the file reference containing the memory
           * and remove the reference to the Memory, so that it can be GC'd.
           *
           * Since we are setting on the underlying data store directly,
           * this won't reset the ttl
           *
           * Note we do not mutate the old object, and instead cache a new one,
           * in case the old object containing the memory is in use elsewhere
           */
          data.set(key, { evaluation: value.evaluation, File: file, Memory: undefined })
          drainToFileTimers.delete(key)
        }, DRAIN_TO_FILE_THRESHOLD).unref()

        drainToFileTimers.set(key, drainToFile)
      }

      return data.set(key, value)
    },
    lru: data
  }

  return processMemoryCache
}

export function loadProcessCacheUsage () {
  if (!processMemoryCache) return

  return {
    size: processMemoryCache.lru.size,
    calculatedSize: processMemoryCache.lru.calculatedSize,
    processes: processMemoryCache.lru.dump()
      .map(([key, entry]) => ({ process: key, size: entry.size }))
  }
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
    .map(evolve({
      tags: JSON.parse,
      block: JSON.parse
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
        process.owner,
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

export function readProcessMemoryFileWith ({ DIR, readFile }) {
  return (name) => {
    const { stop: stopTimer } = timer('readProcessMemoryFile', { name })
    return readFile(join(DIR, name))
      .finally(stopTimer)
  }
}

export function writeProcessMemoryFileWith ({ DIR, writeFile }) {
  const pendingWrites = new Map()

  return ({ Memory, evaluation }) => {
    const file = `state-${evaluation.processId}.dat`

    /**
     * Wait on the current write to resolve, before beginning to write.
     * This prevent multiple concurrent writes to the same state file,
     * and corrupting the state.
     */
    return (pendingWrites.get(file) || Promise.resolve())
      .then(() => {
        const { stop: stopTimer } = timer('writeProcessMemoryFile', { file })
        const path = join(DIR, file)

        const pending = writeFile(path, Memory)
          .then(() => file)
          .finally(stopTimer)
        pendingWrites.set(file, pending)

        return pending
      })
      .finally(() => pendingWrites.delete(file))
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
  address,
  queryGateway,
  queryCheckpointGateway,
  loadTransactionData,
  PROCESS_IGNORE_ARWEAVE_CHECKPOINTS,
  logger: _logger
}) {
  const logger = _logger.child('ao-process:findLatestProcessMemory')
  readProcessMemoryFile = fromPromise(readProcessMemoryFile)
  address = fromPromise(address)
  findCheckpointFileBefore = fromPromise(findCheckpointFileBefore)
  readCheckpointFile = fromPromise(readCheckpointFile)
  loadTransactionData = fromPromise(loadTransactionData)

  const queryCheckpoints = queryCheckpointsWith({ queryGateway, queryCheckpointGateway, logger })

  const GET_AO_PROCESS_CHECKPOINTS = `
    query GetAoProcessCheckpoints(
      $owner: String!
      $processId: String!
      $limit: Int!
    ) {
      transactions(
        tags: [
          { name: "Process", values: [$processId] }
          { name: "Type", values: ["Checkpoint"] }
          { name: "Data-Protocol", values: ["ao"] }
        ],
        owners: [$owner]
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
        map((node) => {
          const tags = parseTags(node.tags)
          return {
            id: node.id,
            timestamp: parseInt(tags.Timestamp),
            epoch: parseInt(tags.Epoch),
            nonce: parseInt(tags.Nonce),
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
                  logger('Reloading cached process memory from file "%s"', cached.File)
                  return readProcessMemoryFile(cached.File)
                }

                return Rejected('either Memory or File required')
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
            fromFile: cached.File,
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

  function maybeFile (args) {
    const { processId, omitMemory } = args

    /**
     * Attempt to find the latest checkpoint in a file
     */
    return findCheckpointFileBefore({ processId, before: LATEST })
      .chain((latest) => {
        /**
         * No previously created checkpoint is cached in a file,
         * so keep looking
         */
        if (!latest) return Rejected(args)

        /**
         * We have found a previously created checkpoint, cached in a file, so
         * we can skip querying the gateway for it, and instead download the
         * checkpointed Memory directly, from arweave.
         *
         * The "file" checkpoint already contains all the metadata we would
         * otherwise have to pull from the gateway
         */
        return of(latest.file)
          // { Memory: { id, encoding }, evaluation }
          .chain(readCheckpointFile)
          .chain((checkpoint) =>
            of(checkpoint.Memory)
              .chain((id) => {
                if (omitMemory) return Resolved(null)
                return downloadCheckpointFromArweave(id)
              })
              /**
               * Finally map the Checkpoint to the expected shape
               */
              .map((Memory) => ({
                src: 'file',
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
    const { processId, omitMemory } = args

    if (PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.includes(processId)) {
      logger('Arweave Checkpoints are ignored for process "%s". Not attempting to query gateway...', processId)
      return Rejected(args)
    }

    return address()
      .chain((owner) => queryCheckpoints({
        query: GET_AO_PROCESS_CHECKPOINTS,
        variables: { owner, processId, limit: 50 },
        processId,
        before: LATEST
      }))
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
      .bichain(maybeCheckpointFromArweave, Resolved)
      .bichain(coldStart, Resolved)
      .chain(maybeOld({ processId, before }))
      .toPromise()
  }
}

/**
 * @deprecated - we no longer need to find the latest memory
 * before a certain evaluation, since the CU will simply not evaluate an old message.
 *
 * Instead findLatestProcessMemory is used.
 *
 * See https://github.com/permaweb/ao/issues/667
 *
 * TODO: eventually remove when we know we won't need this anymore
 */
export function findProcessMemoryBeforeWith ({
  cache,
  findCheckpointFileBefore,
  readCheckpointFile,
  address,
  queryGateway,
  queryCheckpointGateway,
  loadTransactionData,
  PROCESS_IGNORE_ARWEAVE_CHECKPOINTS,
  logger: _logger
}) {
  const logger = _logger.child('ao-process:findProcessMemoryBefore')
  address = fromPromise(address)
  findCheckpointFileBefore = fromPromise(findCheckpointFileBefore)
  readCheckpointFile = fromPromise(readCheckpointFile)
  loadTransactionData = fromPromise(loadTransactionData)

  const queryCheckpoints = queryCheckpointsWith({ queryGateway, queryCheckpointGateway, logger })

  const GET_AO_PROCESS_CHECKPOINTS = `
    query GetAoProcessCheckpoints(
      $owner: String!
      $processId: String!
      $limit: Int!
    ) {
      transactions(
        tags: [
          { name: "Process", values: [$processId] }
          { name: "Type", values: ["Checkpoint"] }
          { name: "Data-Protocol", values: ["ao"] }
        ],
        owners: [$owner]
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
  function determineLatestCheckpointBefore ({ timestamp, ordinate, cron }) {
    return (edges) => transduce(
      compose(
        map(prop('node')),
        map((node) => {
          const tags = parseTags(node.tags)
          return {
            id: node.id,
            timestamp: parseInt(tags.Timestamp),
            epoch: parseInt(tags.Epoch),
            nonce: parseInt(tags.Nonce),
            ordinate: tags.Nonce,
            module: tags.Module,
            blockHeight: parseInt(tags['Block-Height']),
            cron: tags['Cron-Interval'],
            encoding: tags['Content-Encoding']
          }
        })
      ),
      latestCheckpointBefore({ timestamp, ordinate, cron }),
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
    const { processId, timestamp, ordinate, cron, omitMemory } = args

    return of(processId)
      .chain((processId) => {
        const cached = cache.get(processId)

        /**
         * There is no cached memory, or the cached memory is later
         * than the timestamp we're interested in
         */
        if (
          !cached ||
          (timestamp && isLaterThan({ timestamp, ordinate, cron }, cached.evaluation))
        ) return Rejected(args)

        logger(
          'MEMORY CHECKPOINT: Found Checkpoint in in-memory cache for process "%s" before message with parameters "%j": "%j"',
          processId,
          { timestamp, ordinate, cron },
          cached.evaluation
        )

        return of(cached)
          .chain((cached) => {
            if (omitMemory) return Resolved(null)
            return of(cached).chain(fromPromise((cached) => gunzipP(cached.Memory)))
          })
          /**
           * Finally map the Checkpoint to the expected shape
           */
          .map((Memory) => ({
            src: 'memory',
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

  function maybeFile (args) {
    const { processId, timestamp, ordinate, cron, omitMemory } = args

    /**
     * Attempt to find the lastest checkpoint in a file before the parameters
     */
    return findCheckpointFileBefore({ processId, timestamp, ordinate, cron })
      .chain((latest) => {
        if (!latest) return Rejected(args)

        logger(
          'FILE CHECKPOINT: Found Checkpoint for process "%s", before "%j", on Filesystem, with parameters "%j"',
          processId,
          { timestamp, ordinate, cron },
          latest
        )

        /**
         * We have found a Checkpoint that we can use, so
         * now let's load the snapshotted Memory from arweave
         */
        return of(latest.file)
          // { Memory: { id, encoding }, evaluation }
          .chain(readCheckpointFile)
          .chain((checkpoint) =>
            of(checkpoint.Memory)
              .chain((id) => {
                if (omitMemory) return Resolved(null)
                return downloadCheckpointFromArweave(id)
              })
              /**
               * Finally map the Checkpoint to the expected shape
               */
              .map((Memory) => ({
                src: 'file',
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
                    'Error encountered when downloading Checkpoint using cached file for process "%s", before "%j", from Arweave, with parameters "%j"',
                    processId,
                    { timestamp, ordinate, cron },
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
    const { processId, timestamp, ordinate, cron, omitMemory } = args

    if (PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.includes(processId)) {
      logger('Arweave Checkpoints are ignored for process "%s". Not attempting to query gateway...', processId)
      return Rejected(args)
    }

    return address()
      .chain((owner) => queryCheckpoints({
        query: GET_AO_PROCESS_CHECKPOINTS,
        variables: { owner, processId, limit: 50 },
        processId,
        timestamp,
        ordinate,
        cron
      }))
      .map(path(['data', 'transactions', 'edges']))
      .map(determineLatestCheckpointBefore({ timestamp, ordinate, cron }))
      .chain((latestCheckpoint) => {
        if (!latestCheckpoint) return Rejected(args)

        logger(
          'ARWEAVE CHECKPOINT: Found Checkpoint for process "%s", before "%j", on Arweave, with parameters "%j"',
          processId,
          { timestamp, ordinate, cron },
          { checkpointTxId: latestCheckpoint.id, ...latestCheckpoint }
        )

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
                'Error encountered when downloading Checkpoint found for process "%s", before "%j", from Arweave, with parameters "%j"',
                processId,
                { timestamp, ordinate, cron },
                { checkpointTxId: latestCheckpoint.id, ...latestCheckpoint },
                err
              )
              return args
            },
            identity
          )
      })
  }

  function coldStart ({ processId, timestamp, ordinate, cron }) {
    if (ordinate > 0) {
      logger(
        '**COLD START**: Could not find a Checkpoint for process "%s" before message with parameters "%j". Initializing Cold Start...',
        processId,
        { timestamp, ordinate, cron }
      )
    }

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

  return ({ processId, timestamp, ordinate, cron, omitMemory = false }) =>
    of({ processId, timestamp, ordinate, cron, omitMemory })
      .chain(maybeCached)
      .bichain(maybeFile, Resolved)
      .bichain(maybeCheckpointFromArweave, Resolved)
      .bichain(coldStart, Resolved)
      .toPromise()
}

export function saveLatestProcessMemoryWith ({ cache, logger, saveCheckpoint, EAGER_CHECKPOINT_THRESHOLD }) {
  return async ({ processId, moduleId, messageId, timestamp, epoch, nonce, ordinate, cron, blockHeight, Memory, evalCount }) => {
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
     * The provided value is not later than the currently cached value,
     * so simply ignore it and return, keeping the current value in cache
     *
     * Having updateAgeOnGet to true also renews the cache value's TTL,
     * which is what we want
     */
    if (cached && isLaterThan(cached, { timestamp, ordinate, cron })) return

    logger(
      'Caching latest memory for process "%s" with parameters "%j"',
      processId,
      { messageId, timestamp, ordinate, cron, blockHeight }
    )
    /**
     * Either no value was cached or the provided evaluation is later than
     * the value currently cached, so overwrite it
     */
    // const { stop: stopTimer } = timer('saveLatestProcessMemory:gzip', { processId, timestamp, ordinate, cron, size: Memory.byteLength })
    // const zipped = await gzipP(Memory, { level: zlibConstants.Z_BEST_SPEED })
    // stopTimer()

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
      cron
    }
    // cache.set(processId, { Memory: zipped, evaluation })
    cache.set(processId, { Memory, evaluation })

    if (!evalCount || !EAGER_CHECKPOINT_THRESHOLD || evalCount < EAGER_CHECKPOINT_THRESHOLD) return

    /**
     * Eagerly create the Checkpoint on the next event queue drain
     */
    setImmediate(() => {
      logger(
        'Eager Checkpoint Threshold of "%d" messages met when evaluating process "%s" up to "%j" -- "%d" evaluations peformed. Eagerly creating a Checkpoint...',
        EAGER_CHECKPOINT_THRESHOLD,
        processId,
        { messageId, timestamp, ordinate, cron, blockHeight },
        evalCount
      )

      // return saveCheckpoint({ Memory: zipped, ...evaluation })
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
  logger: _logger,
  PROCESS_CHECKPOINT_CREATION_THROTTLE,
  DISABLE_PROCESS_CHECKPOINT_CREATION
}) {
  readProcessMemoryFile = fromPromise(readProcessMemoryFile)
  address = fromPromise(address)
  hashWasmMemory = fromPromise(hashWasmMemory)
  buildAndSignDataItem = fromPromise(buildAndSignDataItem)
  uploadDataItem = fromPromise(uploadDataItem)
  writeCheckpointFile = fromPromise(writeCheckpointFile)

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
    const { moduleId, processId, epoch, nonce, timestamp, blockHeight, cron, encoding, Memory, File } = args
    return of()
      .chain(() => {
        if (Memory) return of(Memory)
        if (File) {
          logger('Reloading cached process memory from file "%s"', File)
          return readProcessMemoryFile(File)
        }

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
                { name: 'Epoch', value: `${epoch}`.trim() },
                { name: 'Nonce', value: `${nonce}`.trim() },
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

  const recentCheckpoints = new Map()
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
        /**
         * This CU has already created a Checkpoint
         * for this evaluation so simply noop
         */
        if (checkpoint) {
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
        return writeCheckpointFile({
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
