import { Rejected, fromPromise, of } from 'hyper-async'
import { identity, path } from 'ramda'
import { z } from 'zod'
import Arweave from 'arweave'
import WarpArBundles from 'warp-arbundles'

import { backoff, joinUrl, okRes, okResWithNodeWith } from '../domain/utils.js'

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
 * @property {string} GRAPHQL_URL
 *
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the process whose src is being loaded
 * @returns {Async<z.infer<typeof transactionConnectionSchema>['data']['transactions']['edges'][number]['node']>}
 *
 * @param {Env1} env
 * @returns {LoadTransactionMeta}
 */
export function loadTransactionMetaWith ({ fetch, GRAPHQL_URL, logger }) {
  // TODO: create a dataloader and use that to batch load contracts

  const GET_PROCESSES_QUERY = `
    query GetProcesses (
      $processIds: [ID!]!
      $skipTags: Boolean!
      $skipSignature: Boolean!
      $skipAnchor: Boolean!
    ) {
      transactions(ids: $processIds) {
        edges {
          node {
            id
            signature @skip (if: $skipSignature)
            anchor @skip (if: $skipAnchor)
            owner {
              address
              key
            }
            tags @skip (if: $skipTags) {
              name
              value
            }
            recipient
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

  /**
   * Ideally, this would be in the function schema,
   * but there is a bug with zod and optional function\
   * args https://github.com/colinhacks/zod/issues/2990
   *
   * So we manually run it
   */
  const optionsSchema = z.object({
    skipTags: z.boolean().default(false),
    skipSignature: z.boolean().default(false),
    skipAnchor: z.boolean().default(false)
  }).default({})

  return (id, options) => {
    const okResWithNode = okResWithNodeWith(logger, id)
    return of(id)
      .map((id) => {
        const variables = optionsSchema.parse(options)
        variables.processIds = [id]
        return variables
      })
      .chain(fromPromise((variables) =>
        backoff(
          () => fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: GET_PROCESSES_QUERY, variables })
          }).then(okResWithNode),
          { maxRetries: 5, delay: 500, log: logger, name: `loadTransactionMeta(${JSON.stringify({ id })})` }
        )
          .then(transactionConnectionSchema.parse)
          .then(path(['data', 'transactions', 'edges', '0', 'node']))
          .then((node) => {
            if (node) return node
            logger('Transaction "%s" was not found on gateway', id)
            // TODO: better error handling
            const err = new Error(`Transaction '${id}' not found on gateway`)
            err.status = 404
            throw err
          })
      ))
      .toPromise()
  }
}

/**
   * @typedef Env2
   * @property {fetch} fetch
   * @property {string} ARWEAVE_URL
   *
   * @callback LoadTransactionData
   * @param {string} id - the id of the process whose src is being loaded
   * @returns {Async<Response>}
   *
   * @param {Env2} env
   * @returns {LoadTransactionData}
   */
export function loadTransactionDataWith ({ fetch, ARWEAVE_URL, logger }) {
  // TODO: create a dataloader and use that to batch load processes
  return (id) =>
    of(id)
      .chain(fromPromise((id) =>
        backoff(
          () => fetch(joinUrl({ url: ARWEAVE_URL, path: `/raw/${id}` })).then(okRes),
          { maxRetries: 5, delay: 500, log: logger, name: `loadTransactionData(${JSON.stringify({ id })})` }
        )
          .then(async (res) => {
            if (res.ok) return res
            logger('Error Encountered when fetching raw data for transaction \'%s\'', id)
            throw new Error(`Error encountered when fetching transaction '${id}' from arweave: ${res.status}: ${await res.text()}`)
          })
      ))
      .toPromise()
}

export function queryGatewayWith ({ fetch, GRAPHQL_URL, logger }) {
  return async ({ query, variables }) => {
    return backoff(
      () =>
        fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables })
        }).then(okRes),
      { maxRetries: 5, delay: 500, log: logger, name: `queryGateway(${JSON.stringify({ query, variables })})` }
    )
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
        logger.tap('Error while communicating with uploader: %O'),
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
