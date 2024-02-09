import { Rejected, fromPromise, of } from 'hyper-async'
import { identity, last, map, path, pathSatisfies, pipe, pluck, prop } from 'ramda'
import { z } from 'zod'
import Arweave from 'arweave'
import WarpArBundles from 'warp-arbundles'

const { createData, ArweaveSigner } = WarpArBundles

/**
 * @type {Arweave}
 */
let internalArweaveClient
export function createWalletClient () {
  if (internalArweaveClient) return internalArweaveClient
  internalArweaveClient = Arweave.init()
  return internalArweaveClient
}

export function addressWith ({ WALLET, arweave = internalArweaveClient }) {
  const wallet = JSON.parse(WALLET)
  const addressP = arweave.wallets.jwkToAddress(wallet)

  return () => addressP
}

export function buildAndSignDataItemWith ({ WALLET, createDataItem = createData }) {
  const signer = new ArweaveSigner(WALLET)

  return async ({ data, tags, anchor }) => {
    const dataItem = createDataItem(data, signer, { anchor, tags })
    await dataItem.sign(signer)
    return {
      id: await dataItem.id,
      data: dataItem.getRaw()
    }
  }
}

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
export function loadTransactionMetaWith ({ fetch, GATEWAY_URL, logger }) {
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
          .then(async (res) => {
            if (res.ok) return res.json()
            logger(
              'Error Encountered when fetching transaction \'%s\' from gateway \'%s\'',
              id,
              GATEWAY_URL
            )
            throw new Error(`${res.status}: ${await res.text()}`)
          })
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
export function loadTransactionDataWith ({ fetch, GATEWAY_URL, logger }) {
  // TODO: create a dataloader and use that to batch load processes

  return (id) =>
    of(id)
      .chain(fromPromise((id) =>
        fetch(`${GATEWAY_URL}/raw/${id}`)
          .then(async (res) => {
            if (res.ok) return res
            logger(
              'Error Encountered when fetching raw data for transaction \'%s\' from gateway \'%s\'',
              id,
              GATEWAY_URL
            )
            throw new Error(`${res.status}: ${await res.text()}`)
          })
      ))
      .toPromise()
}

export function queryGatewayWith ({ fetch, GATEWAY_URL, logger }) {
  return async ({ query, variables }) => {
    return fetch(`${GATEWAY_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    })
      .then(async (res) => {
        if (res.ok) return res.json()
        logger('Error Encountered when querying gateway')
        throw new Error(`${res.status}: ${await res.text()}`)
      })
  }
}

export function uploadDataItemWith ({ UPLOADER_URL, fetch, logger }) {
  return async (dataItem) => {
    return of(dataItem)
      .chain(fromPromise((body) =>
        fetch(`${UPLOADER_URL}/tx/arweave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            Accept: 'application/json'
          },
          body
        })
      ))
      .bimap(
        logger.tap('Error while communicating with uploader:'),
        identity
      )
      .bichain(
        (err) => Rejected(JSON.stringify(err)),
        fromPromise(async (res) => {
          if (!res?.ok) {
            const text = await res.text()
            throw new Error(`${res.status}: ${text}`)
          }
          return res.json()
        })
      )
      .toPromise()
  }
}
