import { fromPromise, of } from 'hyper-async'
import { applySpec, last, map, path, pathSatisfies, pipe, pluck, prop, props, splitEvery } from 'ramda'
import { z } from 'zod'
import pMap from 'p-map'
import CircuitBreaker from 'opossum'

import { blockSchema } from '../domain/model.js'
import { backoff, okRes, strFromFetchError } from '../domain/utils.js'
import { BLOCKS_TABLE } from './db.js'

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
      parameters: db.engine === 'sqlite' ? blocks.map(props(['height', 'height', 'timestamp'])) : blocks.map(props(['height', 'height', 'timestamp'])).flat()
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
      /**
       * Sqlite only allows 999 variables per statement, by default.
       *
       * So we split our blocks into groups of 250 => 750 variables per prepared statement
       * then execute them in parallel, with a max concurrency of 5 groups, which should
       * handle the majority of cases where a large amount of blocks are having to be loaded
       */
      .map(splitEvery(250))
      .chain(fromPromise((blockGroups) =>
        pMap(
          blockGroups,
          (blocks) => db.run(createQuery(blocks)),
          {
            concurrency: 5,
            stopOnError: false
          }
        )
      ))
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
 * @property {string[]} GRAPHQL_URLS - An array of urls to query
 * @property {number} pageSize
 *
 * @callback LoadBlocksMeta
 * @param {{ min: number, max: number }} range - the block height range
 * @returns {Async<any>}
 *
 * @param {Env1} env
 * @returns {LoadBlocksMeta}
 */
export function loadBlocksMetaWith ({
  fetch, GRAPHQL_URLS, pageSize, logger, breakerOptions = {
    timeout: 10000, // 10 seconds timeout
    errorThresholdPercentage: 50, // open circuit after 50% failures
    resetTimeout: 15000, // attempt to close circuit after 15 seconds
    volumeThreshold: 15 // only use rolling windows of 15 or more requests
  }
}) {
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

  function customFetch (urls, options, retry = 0) {
    const urlLength = urls.length
    const url = urls[retry % urlLength]
    return fetch(url, options)
  }
  async function fetchPage ({ min, maxTimestamp }) {
    return Promise.resolve({ min, limit: pageSize })
      .then(variables => {
        logger(
          'Loading page of up to %s blocks after height %s up to timestamp %s',
          pageSize,
          min,
          maxTimestamp
        )
        return variables
      })
      .then((variables) => {
        return backoff(
          ({ retry }) => {
            return customFetch(
              GRAPHQL_URLS,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: GET_BLOCKS_QUERY,
                  variables
                })
              },
              retry
            )
              .then(okRes)
              .catch(async (e) => {
                logger(
                  'Error Encountered when fetching page of block metadata from gateway with minBlock \'%s\' and maxTimestamp \'%s\'',
                  min,
                  maxTimestamp
                )
                throw new Error(`Can not communicate with gateway to retrieve block metadata: ${await strFromFetchError(e)}`)
              })
          },
          { maxRetries: 4, delay: 300, log: logger, name: `loadBlockMeta(${JSON.stringify({ newMin: min, maxTimestamp })})` }
        )
      })
      .then(async (res) => {
        if (res.ok) return res.json()
        logger(
          'Error Encountered when fetching page of block metadata from gateway with minBlock \'%s\' and maxTimestamp \'%s\'',
          min,
          maxTimestamp
        )
        throw new Error(`${res.status}: ${await res.text()}`)
      })
      .then(path(['data', 'blocks']))
      .then((res) => ({ ...res, maxTimestamp }))
  }

  /**
   * Fetching each page is wrapped in a circuit breaker, so as to rate limit
   * and hedge against timeouts
   */
  const circuitBreaker = new CircuitBreaker(fetchPage, breakerOptions)

  async function fetchAllPages ({ min, maxTimestamp }) {
    /**
     * Need to convert to seconds, since block timestamp
     * from arweave is in seconds
     */
    maxTimestamp = Math.floor(maxTimestamp / 1000)

    async function maybeFetchNext ({ pageInfo, edges, maxTimestamp }) {
      /**
       * Base cases:
       * - the maxTimestamp has been surpassed by the last element in the latest page
       * - there is no next page
       *
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
        .then((nextArgs) => circuitBreaker.fire(nextArgs))
        .then(maybeFetchNext)
        /**
         * Recursively concatenate all edges
         */
        .then(({ pageInfo, edges: e }) => ({ pageInfo, edges: edges.concat(e) }))
    }

    /**
     * Start with the first page, then keep going
     */
    return circuitBreaker.fire({ min, maxTimestamp })
      .then(maybeFetchNext)
      .catch((e) => {
        if (e.message === 'Breaker is open') throw new Error('Can not communicate with gateway to retrieve block metadata (breaker is open)')
        else throw e
      })
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
      ))
      .toPromise()
}
