import { promisify } from 'node:util'
import { gunzip, gzip } from 'node:zlib'
import { Readable } from 'node:stream'
import { basename, join } from 'node:path'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, compose, identity, map, path, prop, transduce } from 'ramda'
import { z } from 'zod'
import { LRUCache } from 'lru-cache'

import { processSchema } from '../model.js'
import { COLLATION_SEQUENCE_MIN_CHAR } from './pouchdb.js'

const gunzipP = promisify(gunzip)
const gzipP = promisify(gzip)

function pluckTagValue (name, tags) {
  const tag = tags.find((t) => t.name === name)
  return tag ? tag.value : undefined
}

/**
 * @type {{
 *  get: LRUCache<string, { evaluation: Evaluation, Memory: ArrayBuffer }>['get']
 *  set: LRUCache<string, { evaluation: Evaluation, Memory: ArrayBuffer }>['set']
 *  lru: LRUCache<string, { evaluation: Evaluation, Memory: ArrayBuffer }>
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
export async function createProcessMemoryCache ({ MAX_SIZE, TTL, onEviction }) {
  if (processMemoryCache) return processMemoryCache

  /**
   * Could not get TTL in this cache to work nicely with the
   * AoLoader overwriting apis like performance.now() and Date.now().
   *
   * So for now, we're handrolling ttl tracking by using setTimeout
   * and a vanilla Map
   */
  const timers = new Map()
  const clearTimer = (key) => {
    if (timers.has(key)) {
      clearTimeout(timers.get(key))
      timers.delete(key)
    }
  }

  const data = new LRUCache({
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
    noDisposeOnSet: true,
    disposeAfter: (value, key, reason) => {
      if (reason === 'set') return

      clearTimer(key)
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
      clearTimer(key)
      /**
       * TODO: revisit, as I don't know how this will impact performance,
       * having lots of setTimeouts
       *
       * Calling delete will trigger the disposeAfter callback on the cache
       * to be called
       */
      const t = setTimeout(() => data.delete(key), TTL)
      /**
       * Unref the timer, so node can close without waiting on the timer
       * to invoke its callback
       */
      t.unref()
      timers.set(key, t)

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

const processDocSchema = z.object({
  _id: z.string().min(1),
  processId: processSchema.shape.id,
  signature: processSchema.shape.signature,
  data: processSchema.shape.data,
  anchor: processSchema.shape.anchor,
  owner: processSchema.shape.owner,
  tags: processSchema.shape.tags,
  block: processSchema.shape.block,
  type: z.literal('process')
})

function isLaterThan (eval1, eval2) {
  const t1 = `${eval1.timestamp}`
  const t2 = `${eval2.timestamp}`
  /**
   * timestamps are equal some might be two crons on overlapping interval,
   * so compare the crons
   */
  if (t2 === t1) return (eval2.cron || '') > (eval1.cron || '')

  return t2 > t1
}

function isEarlierThan (eval1, eval2) {
  const t1 = `${eval1.timestamp}`
  const t2 = `${eval2.timestamp}`
  /**
   * timestamps are equal some might be two crons on overlapping interval,
   * so compare the crons
   */
  if (t2 === t1) return (eval2.cron || '') < (eval1.cron || '')

  return t2 < t1
}

function isEqualTo (eval1, eval2) {
  const t1 = `${eval1.timestamp}`
  const t2 = `${eval2.timestamp}`

  return t2 === t1 &&
    (eval2.cron || '') === (eval1.cron || '')
}

function latestCheckpointBefore ({ timestamp, ordinate, cron }) {
  return (latest, checkpoint) => {
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
      (latest && isEarlierThan(latest, checkpoint))
    ) return latest

    /**
     * this checkpoint is the new latest we've come across
     */
    return checkpoint
  }
}

export function createProcessId ({ processId }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `proc-${processId}`
}

export function findProcessWith ({ pouchDb }) {
  return ({ processId }) => of(processId)
    .chain(fromPromise(id => pouchDb.get(createProcessId({ processId: id }))))
    .bichain(
      (err) => {
        if (err.status === 404) return Rejected({ status: 404, message: 'Process not found' })
        return Rejected(err)
      },
      (found) => of(found)
        .map(processDocSchema.parse)
        .map(applySpec({
          id: prop('processId'),
          signature: prop('signature'),
          data: prop('data'),
          anchor: prop('anchor'),
          owner: prop('owner'),
          tags: prop('tags'),
          block: prop('block')
        }))
    )
    .toPromise()
}

export function saveProcessWith ({ pouchDb }) {
  return (process) => {
    return of(process)
      .map(applySpec({
        _id: process => createProcessId({ processId: process.id }),
        processId: prop('id'),
        signature: prop('signature'),
        data: prop('data'),
        anchor: prop('anchor'),
        owner: prop('owner'),
        tags: prop('tags'),
        block: prop('block'),
        type: always('process')
      }))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(processDocSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => pouchDb.put(doc)))
          .bichain(
            (err) => {
              /**
               * Already exists, so just return the doc
               */
              if (err.status === 409) return Resolved(doc)
              return Rejected(err)
            },
            Resolved
          )
          .map(always(doc._id))
      )
      .toPromise()
  }
}

/**
 * ################################
 * ##### Checkpoint file utils ####
 * ################################
 */

export function findCheckpointFileBeforeWith ({ DIR, glob }) {
  return ({ processId, timestamp, ordinate, cron }) => {
    /**
     * Find all the Checkpoint files for this process
     *
     * names like: eval-{processId},{timestamp},{ordinate},{cron}.json
     */
    return glob(join(DIR, `checkpoint-${processId}*.json`))
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
        latestCheckpointBefore({ timestamp, ordinate, cron }),
        undefined
      ))
  }
}

export function readCheckpointFileWith ({ DIR, readFile }) {
  return (name) => readFile(join(DIR, name))
    .then((raw) => JSON.parse(raw))
}

export function writeCheckpointFileWith ({ DIR, writeFile }) {
  return ({ Memory, evaluation }) => {
    const path = join(
      DIR,
      `checkpoint-${[evaluation.processId, evaluation.timestamp, evaluation.ordinate, evaluation.cron].join(',')}.json`
    )

    return writeFile(path, JSON.stringify({ Memory, evaluation }))
  }
}

export function packageMemoryWith ({ PROCESS_MEMORY_COMPRESS }) {
  return async (Memory) => {
    if (!PROCESS_MEMORY_COMPRESS) return { Memory }
    return { Memory: await gzipP(Memory), encoding: 'gzip' }
  }
}

export function unpackageMemoryWith ({ PROCESS_MEMORY_COMPRESS }) {
  return async ({ Memory, encoding }) => {
    if (!PROCESS_MEMORY_COMPRESS) return Memory
    if (encoding !== 'gzip') throw new Error('Only GZIP encoding is currently supported for Process Memory Snapshot')

    return gunzipP(Memory)
  }
}

export function findProcessMemoryBeforeWith ({
  cache,
  unpackageMemory,
  findCheckpointFileBefore,
  readCheckpointFile,
  address,
  queryGateway,
  loadTransactionData,
  logger: _logger
}) {
  const logger = _logger.child('ao-process:findProcessMemoryBefore')
  unpackageMemory = fromPromise(unpackageMemory)
  findCheckpointFileBefore = fromPromise(findCheckpointFileBefore)
  readCheckpointFile = fromPromise(readCheckpointFile)
  address = fromPromise(address)
  queryGateway = fromPromise(queryGateway)
  loadTransactionData = fromPromise(loadTransactionData)

  const GET_AO_PROCESS_CHECKPOINTS = `
    query GetAoProcessCheckpoints(
      $owner: String!
      $processId: String!
      $limit: Int!
    ) {
      transactions(
        tags: [
          { name: "Data-Protocol", values: ["ao"] }
          { name: "Type", values: ["Checkpoint"] }
          { name: "Process", values: [$processId] }
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
          return {
            id: node.id,
            timestamp: pluckTagValue('Timestamp', node.tags),
            ordinate: pluckTagValue('Nonce', node.tags),
            blockHeight: pluckTagValue('Block-Height', node.tags),
            cron: pluckTagValue('Cron-Interval', node.tags),
            encoding: pluckTagValue('Content-Encoding', node.tags)
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
    return loadTransactionData(checkpoint.id)
      .chain(fromPromise((res) => res.arrayBuffer()))
      /**
       * If the buffer is encoded, we need to decode it before continuing
       */
      .chain(fromPromise(decodeData(checkpoint.encoding)))
  }

  function maybeCached ({ processId, timestamp, ordinate, cron }) {
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
        ) return Rejected({ processId, timestamp, ordinate, cron })

        logger(
          'MEMORY CHECKPOINT: Found Checkpoint in in-memory cache for process "%s" before message with parameters "%j": "%j"',
          processId,
          { timestamp, ordinate, cron },
          cached.evaluation
        )

        return of(cached)
          .chain((cached) => unpackageMemory({ Memory: cached.Memory, encoding: cached.evaluation.encoding }))
          /**
           * Finally map the Checkpoint to the expected shape
           */
          .map((Memory) => ({
            Memory,
            timestamp: cached.evaluation.timestamp,
            blockHeight: cached.evaluation.blockHeight,
            cron: cached.evaluation.cron,
            ordinate: cached.evaluation.ordinate
          }))
      })
  }

  function maybeFile ({ processId, timestamp, ordinate, cron }) {
    /**
     * Attempt to find the lastest checkpoint in a file before the parameters
     */
    return findCheckpointFileBefore({ processId, timestamp, ordinate, cron })
      .chain((latest) => {
        if (!latest) return Rejected({ processId, timestamp, ordinate, cron })

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
              .chain(downloadCheckpointFromArweave)
              /**
               * Finally map the Checkpoint to the expected shape
               */
              .map((Memory) => ({
                Memory,
                timestamp: checkpoint.evaluation.timestamp,
                blockHeight: checkpoint.evaluation.blockHeight,
                cron: checkpoint.evaluation.cron,
                ordinate: checkpoint.evaluation.ordinate
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
                  return { processId, timestamp, ordinate, cron }
                },
                identity
              )
          )
      })
  }

  function maybeCheckpointFromArweave ({ processId, timestamp, ordinate, cron }) {
    const queryCheckpoint = (attempt) => (variables) =>
      queryGateway({ query: GET_AO_PROCESS_CHECKPOINTS, variables })
        .bimap(
          (err) => {
            logger(
              'Error encountered querying gateway for Checkpoint for process "%s", before "%j". Attempt %d...',
              processId,
              { timestamp, ordinate, cron },
              attempt,
              err
            )
            return variables
          },
          identity
        )

    return address()
      .map((owner) => ({ owner, processId, limit: 50 }))
      /**
       * The gateway tends to timeout when making this query,
       * but then will start working on retries.
       *
       * (I suspect the gateway is performing work, and times out on the first request,
       * but then work is cached, which HITs on subsequent requests)
       */
      .chain(queryCheckpoint(1))
      // Retry
      .bichain(queryCheckpoint(2), Resolved)
      // Retry
      .bichain(queryCheckpoint(3), Resolved)
      .map(path(['data', 'transactions', 'edges']))
      .map(determineLatestCheckpointBefore({ timestamp, ordinate, cron }))
      .chain((latestCheckpoint) => {
        if (!latestCheckpoint) return Rejected({ processId, timestamp, ordinate, cron })

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
        return downloadCheckpointFromArweave(latestCheckpoint)
          /**
           * Finally map the Checkpoint to the expected shape
           */
          .map((Memory) => ({
            Memory,
            timestamp: latestCheckpoint.timestamp,
            blockHeight: latestCheckpoint.blockHeight,
            cron: latestCheckpoint.cron,
            /**
             * Derived from Nonce on Checkpoint
             * (see determineLatestCheckpointBefore)
             */
            ordinate: latestCheckpoint.ordinate
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
              return { processId, timestamp, ordinate, cron }
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
      Memory: null,
      timestamp: undefined,
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

  return ({ processId, timestamp, ordinate, cron }) =>
    of({ processId, timestamp, ordinate, cron })
      .chain(maybeCached)
      .bichain(maybeFile, Resolved)
      .bichain(maybeCheckpointFromArweave, Resolved)
      .bichain(coldStart, Resolved)
      .toPromise()
}

export function saveLatestProcessMemoryWith ({ cache, logger, packageMemory, saveCheckpoint, EAGER_CHECKPOINT_THRESHOLD }) {
  return async ({ processId, moduleId, messageId, timestamp, epoch, nonce, ordinate, cron, blockHeight, Memory, evalCount }) => {
    const cached = cache.get(processId)

    /**
     * The provided value is not later than the currently cached value,
     * so simply ignore it and return, keeping the current value in cache
     *
     * Having updateAgeOnGet to true also renews the cache value's TTL,
     * which is what we want
     */
    if (cached && isLaterThan(cached, { timestamp, ordinate, cron })) return

    logger(
      'Saving latest memory for process "%s" with parameters "%j"',
      processId,
      { messageId, timestamp, ordinate, cron, blockHeight }
    )
    /**
     * Either no value was cached or the provided evaluation is later than
     * the value currently cached, so overwrite it
     */
    const { Memory: packaged, encoding } = await packageMemory(Memory)
    const evaluation = {
      processId,
      moduleId,
      timestamp,
      epoch,
      nonce,
      blockHeight,
      ordinate,
      encoding,
      cron
    }
    cache.set(processId, { Memory: packaged, evaluation })

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

      return saveCheckpoint({ Memory: packaged, ...evaluation })
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
  queryGateway = fromPromise(queryGateway)
  address = fromPromise(address)
  hashWasmMemory = fromPromise(hashWasmMemory)
  buildAndSignDataItem = fromPromise(buildAndSignDataItem)
  uploadDataItem = fromPromise(uploadDataItem)
  writeCheckpointFile = fromPromise(writeCheckpointFile)

  const logger = _logger.child('ao-process:saveCheckpoint')

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
          { name: "Data-Protocol", values: ["ao"] }
          { name: "Type", values: ["Checkpoint"] }
          { name: "Process", values: [$processId] }
          { name: "Nonce", values: [$nonce] }
          { name: "Timestamp", values: [$timestamp] }
          ${withCron ? '{ name: "Cron-Interval", values: [$cron] }' : ''}
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

  function createCheckpointDataItem ({ moduleId, processId, epoch, nonce, timestamp, blockHeight, cron, encoding, Memory }) {
    return of(Memory)
      .map((Memory) =>
        ArrayBuffer.isView(Memory)
          /**
           * Ensure that we are always passing a Buffer to Readable.from
           * which will throw an error if given a TypedArray
           *
           * To avoid a copy, use the typed array's underlying ArrayBuffer to back
           * new Buffer, respecting the "view", i.e. byteOffset and byteLength
           */
          ? Buffer.from(Memory.buffer, Memory.byteOffset, Memory.byteLength)
          : Buffer.from(Memory)
      )
      /**
       * Encode to gzip, if not already encoded
       */
      .chain(fromPromise(async (buffer) => {
        if (encoding) {
          if (encoding !== 'gzip') throw new Error('Only GZIP encoding is currently supported for Process Memory Snapshot')
          /**
           * already gzipped encoded, so just return it
           */
          return buffer
        }

        return gzipP(buffer)
      }))
      .chain((buffer) =>
        of(buffer)
          .chain((buffer) => hashWasmMemory(Readable.from(buffer), encoding))
          .map((sha) => {
            /**
             * TODO: what should we set anchor to?
             */
            const dataItem = {
              data: buffer,
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
                { name: 'Content-Encoding', value: 'gzip' }
              ]
            }

            if (cron) dataItem.tags.push({ name: 'Cron-Interval', value: cron })

            return dataItem
          })
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

  function maybeCheckpointDisabled ({ Memory, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron }) {
    /**
     * Creating Checkpoints is enabled, so continue
     */
    if (!DISABLE_PROCESS_CHECKPOINT_CREATION) return Rejected({ Memory, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron })

    logger('Checkpoint creation is disabled on this CU, so no work needs to be done for process "%s"', processId)
    return Resolved()
  }

  function maybeRecentlyCheckpointed ({ Memory, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron }) {
    /**
     * A Checkpoint has not been recently created for this process, so continue
     */
    if (!recentCheckpoints.has(processId)) return Rejected({ Memory, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron })

    logger('Checkpoint was recently created for process "%s", and so not creating another one.', processId)
    return Resolved()
  }

  function createCheckpoint ({ Memory, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron }) {
    const queryCheckpoint = (attempt) => (variables) =>
      queryGateway({ query: GET_AO_PROCESS_CHECKPOINTS(!!cron), variables })
        .bimap(
          (err) => {
            logger(
              'Error encountered querying gateway for Checkpoint for process "%s", before "%j". Attempt %d...',
              processId,
              { timestamp, ordinate, cron },
              attempt,
              err
            )
            return variables
          },
          identity
        )

    return address()
      .map((owner) => ({
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
      }))
      /**
       * The gateway tends to timeout when making this query,
       * but then will start working on retries.
       *
       * (I suspect the gateway is performing work, and times out on the first request,
       * but then work is cached, which HITs on subsequent requests)
       */
      .chain(queryCheckpoint(1))
      // Retry
      .bichain(queryCheckpoint(2), Resolved)
      // Retry
      .bichain(queryCheckpoint(3), Resolved)
      .map(path(['data', 'transactions', 'edges', '0']))
      .chain((checkpoint) => {
        /**
         * This CU has already created a Checkpoint
         * for this evaluation so simply noop
         */
        if (checkpoint) {
          return Resolved({ id: checkpoint.node.id, encoding: pluckTagValue('Content-Encoding', checkpoint.node.tags) })
        }

        /**
         * Construct and sign an ao Checkpoint data item
         * and upload it to Arweave.
         */
        return of({ moduleId, processId, epoch, nonce, timestamp, blockHeight, cron, encoding })
          .map(logger.tap('Creating Checkpoint for evaluation: %j'))
          .chain((args) => createCheckpointDataItem({ ...args, Memory }))
          .chain((dataItem) => uploadDataItem(dataItem.data))
          .bimap(
            logger.tap('Failed to upload Checkpoint DataItem'),
            (res) => {
              logger(
                'Successfully uploaded Checkpoint DataItem for process "%s" on evaluation "%j"',
                processId,
                { checkpointTxId: res.id, processId, nonce, timestamp, cron }
              )
              /**
               * Track that we've recently created a checkpoint for this
               * process, in case the CU attempts to create another one
               *
               * within the PROCESS_CHECKPOINT_CREATION_THROTTLE
               */
              addRecentCheckpoint(processId)

              return { id: res.id, encoding }
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
            encoding,
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

  return async ({ Memory, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron }) => {
    return maybeCheckpointDisabled({ Memory, encoding, processId, moduleId, timestamp, epoch, ordinate, nonce, blockHeight, cron })
      .bichain(maybeRecentlyCheckpointed, Resolved)
      .bichain(createCheckpoint, Resolved)
      .toPromise()
  }
}
