import { Rejected, fromPromise, of } from 'hyper-async'
import { identity, path } from 'ramda'
import { z } from 'zod'
import Arweave from 'arweave'
import WarpArBundles from 'warp-arbundles'

import { joinUrl } from '../utils.js'

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
  const signer = new ArweaveSigner(JSON.parse(WALLET))

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

  const GRAPHQL = joinUrl({ url: GATEWAY_URL, path: '/graphql' })

  return (id) =>
    of(id)
      .chain(fromPromise((id) =>
        fetch(GRAPHQL, {
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
        fetch(joinUrl({ url: GATEWAY_URL, path: `/raw/${id}` }))
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
  const GRAPHQL = joinUrl({ url: GATEWAY_URL, path: '/graphql' })

  return async ({ query, variables }) => {
    return fetch(GRAPHQL, {
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
