import { fromPromise, of } from 'hyper-async'
import { last, map, path, pipe, pluck, prop } from 'ramda'
import { z } from 'zod'

/**
 * @typedef Env1
 * @property {fetch} fetch
 * @property {string} GATEWAY_URL
 *
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the process whose src is being loaded
 * @returns {Async<z.infer<typeof transactionConnectionSchema>['data']['transactions']['edges'][number]['node']>}
 *
 * @param {Env1} env
 * @returns {LoadTransactionMeta}
 */
export function loadTransactionMetaWith ({ fetch, GATEWAY_URL }) {
  // TODO: create a dataloader and use that to batch load contracts

  const GET_PROCESSES_QUERY = `
    query GetProcesses ($processIds: [ID!]!) {
      transactions(ids: $processIds) {
        edges {
          node {
            id
            signature
            anchor
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
    }`

  const transactionConnectionSchema = z.object({
    data: z.object({
      transactions: z.object({
        edges: z.array(z.object({
          node: z.record(z.any())
        }))
      })
    })
  })

  return (id) =>
    of(id)
      .chain(fromPromise((id) =>
        fetch(`${GATEWAY_URL}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: GET_PROCESSES_QUERY,
            variables: { processIds: [id] }
          })
        })
          .then((res) => res.json())
          .then(transactionConnectionSchema.parse)
          .then(path(['data', 'transactions', 'edges', '0', 'node']))
      ))
      .toPromise()
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
    query GetBlocks($min: Int!, $max: Int!, $limit: Int!) {
      blocks(
        height: { min: $min, max: $max },
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

  async function fetchAllPages ({ min, max }) {
    async function fetchPage ({ min: newMin }) {
      // deno-fmt-ignore-start
      return Promise.resolve({ min: newMin, max, limit: pageSize })
        .then(variables => {
          logger(
            'Loading page of up to %s blocks after %s up to %s',
            pageSize,
            newMin,
            max
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
        .then((res) => res.json())
        .then(path(['data', 'blocks']))
    }

    async function maybeFetchNext ({ pageInfo, edges }) {
      /**
       * Either have reached the end and resolve,
       * or fetch the next page and recurse
       */
      return !pageInfo.hasNextPage
        ? { pageInfo, edges }
        : Promise.resolve({
          /**
           * The next page will start on the next block
           */
          min: pipe(
            last,
            path(['node', 'height']),
            height => height + 1
          )(edges)
        })
          .then(fetchPage)
          .then(maybeFetchNext)
          .then(({ pageInfo, edges: e }) => ({ pageInfo, edges: edges.concat(e) }))
    }

    /**
     * Start with the first page, then keep going
     */
    return fetchPage({ min, max }).then(maybeFetchNext)
  }

  return (args) =>
    of(args)
      .chain(fromPromise(({ min, max }) =>
        fetchAllPages({ min, max })
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
          .then(logger.tap('Loaded blocks meta after %s up to %s', min, max))
      ))
      .toPromise()
}

/**
   * @typedef Env2
   * @property {fetch} fetch
   * @property {string} GATEWAY_URL
   *
   * @callback LoadTransactionData
   * @param {string} id - the id of the process whose src is being loaded
   * @returns {Async<Response>}
   *
   * @param {Env2} env
   * @returns {LoadTransactionData}
   */
export function loadTransactionDataWith ({ fetch, GATEWAY_URL }) {
  // TODO: create a dataloader and use that to batch load processes

  return (id) =>
    of(id)
      .chain(fromPromise((id) => fetch(`${GATEWAY_URL}/raw/${id}`)))
      .toPromise()
}
