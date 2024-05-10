import { defaultTo, find, juxt, path, pipe, prop, propEq } from 'ramda'

import { InvalidSchedulerLocationError, SchedulerTagNotFoundError, TransactionNotFoundError } from '../err.js'

const URL_TAG = 'Url'
const TTL_TAG = 'Time-To-Live'
const SCHEDULER_TAG = 'Scheduler'

const findTagValue = (name) => pipe(
  defaultTo([]),
  find(propEq(name, 'name')),
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

function gatewayWith ({ fetch, GRAPHQL_URL }) {
  return async ({ query, variables }) => {
    return fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    })
      .then((res) => res.json())
  }
}

export function loadProcessSchedulerWith ({ fetch, GRAPHQL_URL }) {
  const gateway = gatewayWith({ fetch, GRAPHQL_URL })
  const loadScheduler = loadSchedulerWith({ fetch, GRAPHQL_URL })

  const GET_TRANSACTIONS_QUERY = `
    query GetTransactions ($transactionIds: [ID!]!) {
      transactions(ids: $transactionIds) {
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

  return async (process) => {
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

export function loadSchedulerWith ({ fetch, GRAPHQL_URL }) {
  const gateway = gatewayWith({ fetch, GRAPHQL_URL })

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
