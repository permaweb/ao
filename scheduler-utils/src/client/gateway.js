import { defaultTo, find, juxt, path, pipe, prop } from 'ramda'

import { InvalidSchedulerLocationError, SchedulerTagNotFoundError, TransactionNotFoundError } from '../err.js'
import { backoff, okRes } from '../utils.js'

const URL_TAG = 'Url'
const TTL_TAG = 'Time-To-Live'
const SCHEDULER_TAG = 'Scheduler'

const findTagValue = (name) => pipe(
  defaultTo([]),
  find(tag => tag.name && tag.name.toLowerCase() === name.toLowerCase()),
  defaultTo({}),
  prop('value')
)

const findTransactionTags = (err) => pipe(
  (transaction) => {
    if (!transaction) throw new TransactionNotFoundError(err)
    return transaction
  },
  prop('tags'),
  defaultTo([])
)

export const parseHyperBeamResponse = (process) => {
  const commitments = process.commitments
  const processId = Object.keys(commitments).find(key => commitments[key].type === 'rsa-pss-sha256')

  if (!processId) {
    return { id: undefined, tags: [] }
  }

  const signedCommitment = commitments[processId]
  const committed = signedCommitment.committed
  const originalTags = Object.values(signedCommitment['original-tags'])
  const tags = []
  for (const tag of originalTags) {
    const { name, value } = tag
    if (committed.includes(name.toLowerCase())) {
      tags.push({ name, value })
    }
  }
  return { id: processId, tags }
}

function gatewayWith ({ fetch, GRAPHQL_URL, GRAPHQL_MAX_RETRIES = 0, GRAPHQL_RETRY_BACKOFF = 300 }) {
  return async ({ query, variables }) => {
    return backoff(
      () => fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      })
        .then(okRes)
        .then((res) => res.json()),
      { maxRetries: GRAPHQL_MAX_RETRIES, delay: GRAPHQL_RETRY_BACKOFF })
  }
}

export function loadProcessWith ({ fetch, HB_GRAPHQL_URL, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF }) {
  const gateway = gatewayWith({ fetch, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })
  const GET_PROCESS_QUERY = `
        query ($ids: [ID!]!) {
        transactions(
          ids: $ids
          tags: [
            { name: "Type", values: ["Process"] }
        ]) {
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node {
              id
              anchor
              signature
              recipient
              block {
                timestamp
              }
              owner {
                address
                key
              }
              fee {
                winston
                ar
              }
              quantity {
                winston
                ar
              }
              data {
                size
                type
              }
              tags {
                name
                value
              }
              block {
                id
                timestamp
                height
                previous
              }
              parent {
                id
              }
            }
          }
        }
      }
  `
  return async (process) => {
    return fetch(`${HB_GRAPHQL_URL}/${process}/serialize~json@1.0`, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then((res) => res.json())
      .then(parseHyperBeamResponse)
      .catch(_e => {
        return gateway({ query: GET_PROCESS_QUERY, variables: { ids: [process] } })
          .then(path(['data', 'transactions', 'edges', '0', 'node']))
      })
  }
}

export function loadProcessSchedulerWith ({ fetch, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF }) {
  const gateway = gatewayWith({ fetch, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })
  const loadScheduler = loadSchedulerWith({ fetch, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })

  const GET_TRANSACTIONS_QUERY = `
    query GetTransactions ($transactionIds: [ID!]!) {
      transactions(
        ids: $transactionIds
        tags: [
          { name: "Data-Protocol", values: ["ao"] }
        ]
      ) {
        edges {
          node {
            tags {
              name
              value
            }
          }
        }
      }
    }
  `

  const TESTNET_SU_ROUTER = 'https://su-router.ao-testnet.xyz'
  return async (process) => {
    /**
     * TODO: remove eagerly checking testnet su router once
     * gateway issues have been mitigated
     */
    const eagerTestnet = await fetch(`https://su-router.ao-testnet.xyz?process-id=${process}`)
      .then((res) => !res.ok
        ? undefined
        : res.json()
          .then(({ address }) => ({
            url: TESTNET_SU_ROUTER,
            ttl: 1000 * 60 * 60 * 48,
            address
          }))
      )
    if (eagerTestnet) return eagerTestnet

    return gateway({ query: GET_TRANSACTIONS_QUERY, variables: { transactionIds: [process] } })
      .then(path(['data', 'transactions', 'edges', '0', 'node']))
      .then(findTransactionTags(`Process ${process} was not found on gateway`))
      .then(findTagValue(SCHEDULER_TAG))
      .then((walletAddress) => {
        if (!walletAddress) throw new SchedulerTagNotFoundError('No "Scheduler" tag found on process')
        return loadScheduler(walletAddress)
      })
  }
}

export function loadSchedulerWith ({ fetch, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF }) {
  const gateway = gatewayWith({ fetch, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })

  const GET_SCHEDULER_LOCATION = `
    query GetSchedulerLocation ($owner: String!) {
      transactions (
        owners: [$owner]
        tags: [
          { name: "Data-Protocol", values: ["ao"] },
          { name: "Type", values: ["Scheduler-Location"] }
        ]
        # Only need the most recent Scheduler-Location
        sort: HEIGHT_DESC
        first: 1
      ) {
        edges {
          node {
            tags {
              name
              value
            }
          }
        }
      }
    }
  `

  return async (walletAddress) =>
    gateway({ query: GET_SCHEDULER_LOCATION, variables: { owner: walletAddress } })
      .then(path(['data', 'transactions', 'edges', '0', 'node']))
      .then(findTransactionTags(`Could not find 'Scheduler-Location' owner by wallet ${walletAddress}`))
      .then(juxt([
        findTagValue(URL_TAG),
        findTagValue(TTL_TAG)
      ]))
      .then(([url, ttl]) => {
        if (!url) throw new InvalidSchedulerLocationError('No "Url" tag found on Scheduler-Location')
        if (!ttl) throw new InvalidSchedulerLocationError('No "Time-To-Live" tag found on Scheduler-Location')
        return { url, ttl, address: walletAddress }
      })
}
