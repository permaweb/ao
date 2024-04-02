import { fromPromise, of } from 'hyper-async'
import { applySpec, last, map, path, pathSatisfies, pipe, pluck, prop, props } from 'ramda'
import { z } from 'zod'

import { blockSchema } from '../model.js'
import { BLOCKS_TABLE } from './sqlite.js'

const blockDocSchema = z.object({
  id: blockSchema.shape.height,
  height: blockSchema.shape.height,
  timestamp: blockSchema.shape.timestamp
})

const toBlock = applySpec({
  height: prop('height'),
  timestamp: prop('timestamp')
})

export function saveBlocksWith ({ db }) {
  function createQuery (blocks) {
    return {
      sql: `
        INSERT OR IGNORE INTO ${BLOCKS_TABLE}
        (id, height, timestamp)
        VALUES
          ${new Array(blocks.length).fill('(?, ?, ?)').join(',\n')}
      `,
      parameters: blocks.map(props(['height', 'height', 'timestamp']))
    }
  }
  return (blocks) => {
    if (!blocks.length) return of().toPromise()

    return of(blocks)
      .map(
        map(pipe(
          applySpec({
            id: prop('height'),
            height: prop('height'),
            timestamp: prop('timestamp')
          }),
          /**
           * Ensure the expected shape before writing to the db
           */
          blockDocSchema.parse
        ))
      )
      .chain(fromPromise(blocks => db.run(createQuery(blocks))))
      .toPromise()
  }
}

export function findBlocksWith ({ db }) {
  function createQuery ({ minHeight, maxTimestamp }) {
    return {
      sql: `
        SELECT height, timestamp
        FROM ${BLOCKS_TABLE}
        WHERE
          height >= ?
          AND timestamp <= ?
        ORDER BY height ASC
      `,
      parameters: [minHeight, maxTimestamp]
    }
  }

  return ({ minHeight, maxTimestamp }) => {
    return of({ minHeight, maxTimestamp })
      .map(createQuery)
      .chain(fromPromise((query) => db.query(query)))
      .map(map(toBlock))
      .toPromise()
  }
}

/**
 * @typedef Env2
 * @property {fetch} fetch
 * @property {string} GRAPHQL_URL
 * @property {number} pageSize
 *
 * @callback LoadBlocksMeta
 * @param {{ min: number, max: number }} range - the block height range
 * @returns {Async<any>}
 *
 * @param {Env1} env
 * @returns {LoadBlocksMeta}
 */
export function loadBlocksMetaWith ({ fetch, GRAPHQL_URL, pageSize, logger }) {
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
          fetch(GRAPHQL_URL, {
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
            'Error Encountered when fetching page of block metadata from gateway with minBlock \'%s\' and maxTimestamp \'%s\'',
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
