import { fromPromise, of } from 'hyper-async'
import { always, applySpec, last, map, path, pathSatisfies, pipe, pluck, prop } from 'ramda'
import { z } from 'zod'

import { blockSchema } from '../model.js'
import { BLOCKS_ASC_IDX } from './pouchdb.js'

const blockDocSchema = z.object({
  _id: z.string().min(1),
  height: blockSchema.shape.height,
  timestamp: blockSchema.shape.timestamp,
  type: z.literal('block')
})

function createBlockId ({ height, timestamp }) {
  return `block-${height}-${timestamp}`
}

const toBlock = applySpec({
  height: prop('height'),
  timestamp: prop('timestamp')
})

export function saveBlocksWith ({ pouchDb }) {
  return (blocks) => {
    return of(blocks)
      .map(
        map(pipe(
          applySpec({
            _id: (block) => createBlockId(block),
            height: prop('height'),
            timestamp: prop('timestamp'),
            type: always('block')
          }),
          /**
           * Ensure the expected shape before writing to the db
           */
          blockDocSchema.parse
        ))
      )
      .chain(fromPromise(docs => pouchDb.bulkDocs(docs)))
      .toPromise()
  }
}

export function findBlocksWith ({ pouchDb }) {
  function createQuery ({ minHeight, maxTimestamp }) {
    return {
      selector: {
        height: { $gte: minHeight },
        timestamp: { $lte: maxTimestamp }
      },
      sort: [{ height: 'asc' }],
      limit: Number.MAX_SAFE_INTEGER,
      use_index: BLOCKS_ASC_IDX
    }
  }

  return ({ minHeight, maxTimestamp }) => {
    return of({ minHeight, maxTimestamp })
      .map(createQuery)
      .chain(fromPromise((query) => {
        return pouchDb.find(query).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .map(map(toBlock))
      .toPromise()
  }
}

/**
 * @typedef Env2
 * @property {fetch} fetch
 * @property {string} GATEWAY_URL
 * @property {number} pageSize
 *
 * @callback LoadBlocksMeta
 * @param {{ min: number, max: number }} range - the block height range
 * @returns {Async<any>}
 *
 * @param {Env1} env
 * @returns {LoadBlocksMeta}
 */
export function loadBlocksMetaWith ({ fetch, GATEWAY_URL, pageSize, logger }) {
  // TODO: create a dataloader and use that to batch load contracts

  const GET_BLOCKS_QUERY = `
      query GetBlocks($min: Int!, $limit: Int!) {
        blocks(
          height: { min: $min },
          first: $limit,
          sort: HEIGHT_ASC
        ) {
          pageInfo {
            hasNextPage
          }
          edges {
            node {
              timestamp
              height
            }
          }
        }
      }
    `

  async function fetchAllPages ({ min, maxTimestamp }) {
    /**
       * Need to convert to seconds, since block timestamp
       * from arweave is in seconds
       */
    maxTimestamp = Math.floor(maxTimestamp / 1000)

    async function fetchPage ({ min: newMin, maxTimestamp }) {
      // deno-fmt-ignore-start
      return Promise.resolve({ min: newMin, limit: pageSize })
        .then(variables => {
          logger(
            'Loading page of up to %s blocks after height %s up to timestamp %s',
            pageSize,
            newMin,
            maxTimestamp
          )
          return variables
        })
        .then((variables) =>
          fetch(`${GATEWAY_URL}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: GET_BLOCKS_QUERY,
              variables
            })
          })
        )
        .then(async (res) => {
          if (res.ok) return res.json()
          logger(
            'Error Encountered when fetching page of block metadata from gateway \'%s\' with minBlock \'%s\' and maxTimestamp \'%s\'',
            GATEWAY_URL,
            newMin,
            maxTimestamp
          )
          throw new Error(`${res.status}: ${await res.text()}`)
        })
        .then(path(['data', 'blocks']))
        .then((res) => ({ ...res, maxTimestamp }))
    }

    async function maybeFetchNext ({ pageInfo, edges, maxTimestamp }) {
      /**
         * HACK to incrementally fetch the correct range of blocks with only
         * a timestamp as the right most limit.
         *
         * (we no longer have a sortKey to extract a block height from)
         *
         * If the last block has a timestamp greater than the maxTimestamp
         * then we're done.
         *
         * We then slice off the results in the page, not within our range.
         * So we overfetch a little on the final page, but at MOST pageSize - 1
         */
      const surpassedMaxTimestampIdx = edges.findIndex(
        pathSatisfies(
          (timestamp) => timestamp > maxTimestamp,
          ['node', 'timestamp']
        )
      )
      if (surpassedMaxTimestampIdx !== -1) return { pageInfo, edges: edges.slice(0, surpassedMaxTimestampIdx) }

      if (!pageInfo.hasNextPage) return { pageInfo, edges }

      /**
         * Either have reached the end and resolve,
         * or fetch the next page and recurse
         */
      return Promise.resolve({
        /**
           * The next page will start on the next block
           */
        min: pipe(
          last,
          path(['node', 'height']),
          height => height + 1
        )(edges),
        maxTimestamp
      })
        .then(fetchPage)
        .then(maybeFetchNext)
        .then(({ pageInfo, edges: e }) => ({ pageInfo, edges: edges.concat(e) }))
    }

    /**
       * Start with the first page, then keep going
       */
    return fetchPage({ min, maxTimestamp }).then(maybeFetchNext)
  }

  return (args) =>
    of(args)
      .chain(fromPromise(({ min, maxTimestamp }) =>
        fetchAllPages({ min, maxTimestamp })
          .then(prop('edges'))
          .then(pluck('node'))
          .then(map(block => ({
            ...block,
            /**
               * Timestamp from gateway is in seconds,
               * but we need milliseconds
               */
            timestamp: block.timestamp * 1000
          })))
          .then(logger.tap('Loaded blocks meta after height %s up to timestamp %s', min, maxTimestamp))
      ))
      .toPromise()
}
