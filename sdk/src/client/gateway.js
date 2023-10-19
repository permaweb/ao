import { fromPromise, of } from 'hyper-async'
import { path } from 'ramda'
import { z } from 'zod'

/**
 * @typedef Env1
 * @property {fetch} fetch
 * @property {string} GATEWAY_URL
 *
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<z.infer<typeof transactionConnectionSchema>['data']['transactions']['edges'][number]['node']>}
 *
 * @param {Env1} env
 * @returns {LoadTransactionMeta}
 */
export function loadTransactionMetaWith ({ fetch, GATEWAY_URL }) {
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
        fetch(`${GATEWAY_URL}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: GET_TRANSACTIONS_QUERY,
            variables: { transactionIds: [id] }
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
   *
   * @callback LoadTransactionData
   * @param {string} id - the id of the transaction whose data is being loaded
   * @returns {Async<Response>}
   *
   * @param {Env2} env
   * @returns {LoadTransactionData}
   */
export function loadTransactionDataWith ({ fetch, GATEWAY_URL }) {
  // TODO: create a dataloader and use that to batch load contracts

  return (id) =>
    of(id)
      .chain(fromPromise((id) => fetch(`${GATEWAY_URL}/${id}`)))
      .toPromise()
}
