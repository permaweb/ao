import { promisify } from 'node:util'
import { gunzip, gzip } from 'node:zlib'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, complement, compose, map, path, prop, transduce } from 'ramda'
import { z } from 'zod'
import { LRUCache } from 'lru-cache'

import { processSchema } from '../model.js'
import { COLLATION_SEQUENCE_MIN_CHAR } from './pouchdb.js'

const gunzipP = promisify(gunzip)
const gzipP = promisify(gzip)

/**
 * @type {LRUCache<string, { evaluation: Evaluation, Memory: ArrayBuffer }>}
 *
 * @typedef Evaluation
 * @prop {string} processId
 * @prop {string} moduleId
 * @prop {string} epoch
 * @prop {string} nonce
 * @prop {string} timestamp
 * @prop {number} blockHeight
 * @prop {string} ordinate
 * @prop {string} [cron]
 */
let processMemoryCache
export async function createProcessMemoryCache ({ MAX_SIZE, TTL, onEviction }) {
  if (processMemoryCache) return processMemoryCache

  processMemoryCache = new LRUCache({
    /**
     * #######################
     * Time-To-Live configuration
     * #######################
     */
    ttl: TTL,
    /**
     * https://www.npmjs.com/package/lru-cache#allowstale
     *
     * This should help with keeping evaluations fast, despite TTL
     * having passed.
     */
    allowStale: true,
    /**
     * https://www.npmjs.com/package/lru-cache#updateageonget
     */
    updateAgeOnGet: true,
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
     * #######################
     * Disposal configuration
     * #######################
     */
    /**
     * https://www.npmjs.com/package/lru-cache#nodisposeonset
     *
     * Will prevent calling our dispose function
     */
    noDisposeOnSet: true,
    disposeAfter: (value, key) => onEviction({ key, value })
  })

  return processMemoryCache
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
  /**
   * timestamps are equal some might be two crons on overlapping interval,
   * so compare the crons
   */
  if (eval2.timestamp === eval1.timestamp) return (eval2.cron || '') > (eval1.cron || '')

  return eval2.timestamp > eval1.timestamp
}

const isEarlierThan = complement(isLaterThan)

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

export function findProcessMemoryBeforeWith ({
  cache = processMemoryCache,
  queryGateway,
  loadTransactionData,
  logger
}) {
  queryGateway = fromPromise(queryGateway)
  loadTransactionData = fromPromise(loadTransactionData)

  const GET_AO_PROCESS_CHECKPOINTS = `
    query GetAoProcessCheckpoints(
      $processId: String!
      $limit: Int!
    ) {
      transactions(
        tags: [
          { name: "Data-Protocol", values: ["ao"] }
          { name: "Type", values: ["Checkpoint"] }
          { name: "Process", values: [$processId] }
        ],
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

  function pluckTagValue (name, tags) {
    const tag = tags.find((t) => t.name === name)
    return tag ? tag.value : undefined
  }

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
      (latest, checkpoint) => {
        if (!latest) return checkpoint
        /**
         * checkpoint is later than the timestamp we're interested in,
         * so we cannot use it
         */
        if (isLaterThan({ timestamp, ordinate, cron }, checkpoint)) return latest
        /**
         * The checkpoint is earlier than the latest checkpoint we've found,
         * so just ignore it
         */
        if (isEarlierThan(latest, checkpoint)) return latest
        /**
         * this checkpoint is the new latest we've come across
         */
        return checkpoint
      },
      undefined,
      edges
    )
  }

  async function decodeData (encoding) {
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
          'Found Checkpoint in in-memory cache for process "%s" before message with parameters "%j": "%j"',
          processId,
          { timestamp, ordinate, cron },
          cached.evaluation
        )

        return of(cached)
          .chain(fromPromise((cached) => gunzipP(cached.Memory)))
          .map((Memory) => ({
            Memory,
            timestamp: cached.evaluation.timestamp,
            blockHeight: cached.evaluation.blockHeight,
            cron: cached.evaluation.cron,
            ordinate: cached.evaluation.ordinate
          }))
      })
  }

  /**
   * TODO: enable when snapshots are being written to Arweave
   */
  // eslint-disable-next-line no-unused-vars
  function maybeCheckpointFromArweave ({ processId, timestamp, ordinate, cron }) {
    return of({ processId, limit: 50 })
      .chain((variables) => queryGateway({ query: GET_AO_PROCESS_CHECKPOINTS, variables }))
      .map(path(['data', 'transactions', 'edges']))
      .map(determineLatestCheckpointBefore({ timestamp, ordinate, cron }))
      .chain((latestCheckpoint) => {
        if (!latestCheckpoint) return Rejected({ processId, timestamp, ordinate, cron })

        /**
         * We have found a Checkpoint that we can use, so
         * now let's load the snapshotted Memory from arweave
         */
        return loadTransactionData(latestCheckpoint.id)
          .chain(fromPromise((res) => res.body.arrayBuffer()))
          /**
           * If the buffer is encoded, we need to decode it before continuing
           */
          .chain(fromPromise(decodeData(latestCheckpoint.encoding)))
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
      })
  }

  function coldStart ({ processId, timestamp, ordinate, cron }) {
    logger(
      'Could not find a Checkpoint for process "%s" before message with parameters "%j". Initializing Cold Start...',
      processId,
      { timestamp, ordinate, cron }
    )

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
      .bichain(maybeCheckpointFromArweave, Resolved)
      .bichain(coldStart, Resolved)
      .toPromise()
}

export function saveLatestProcessMemoryWith ({ cache = processMemoryCache, logger }) {
  return async ({ processId, moduleId, messageId, timestamp, epoch, nonce, ordinate, cron, blockHeight, Memory }) => {
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
    cache.set(processId, {
      Memory: await gzipP(Memory),
      evaluation: {
        processId,
        moduleId,
        timestamp,
        epoch,
        nonce,
        blockHeight,
        ordinate,
        cron
      }
    })
  }
}
