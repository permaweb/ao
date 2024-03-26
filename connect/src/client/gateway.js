import { fromPromise, of } from 'hyper-async'
import { path } from 'ramda'
import { z } from 'zod'

/**
 * @typedef Env1
 * @property {fetch} fetch
 * @property {string} GRAPHQL_URL
 *
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<z.infer<typeof transactionConnectionSchema>['data']['transactions']['edges'][number]['node']>}
 *
 * @param {Env1} env
 * @returns {LoadTransactionMeta}
 */
export function loadTransactionMetaWith ({ fetch, GRAPHQL_URL, logger }) {
  // TODO: create a dataloader and use that to batch load contracts

  const GET_TRANSACTIONS_QUERY = `
    query GetTransactions ($transactionIds: [ID!]!) {
      transactions(ids: $transactionIds) {
        edges {
          node {
            owner {
              address
            }
            tags {
              name
              value
            }
            block {
              id
              height
              timestamp
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
        fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: GET_TRANSACTIONS_QUERY,
            variables: { transactionIds: [id] }
          })
        })
          .then(async (res) => {
            if (res.ok) return res.json()
            logger('Error Encountered when querying gateway for transaction "%s"', id)
            throw new Error(`${res.status}: ${await res.text()}`)
          })
          .then(transactionConnectionSchema.parse)
          .then(path(['data', 'transactions', 'edges', '0', 'node']))
      ))
      .toPromise()
}
