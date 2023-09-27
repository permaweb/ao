import { fromPromise, of } from 'hyper-async'
import { path } from 'ramda'
import { z } from 'zod'

import { evaluationSchema, interactionSchema } from './model.js'

export const dbClientSchema = z.object({
  findLatestEvaluation: z.function()
    .args(z.object({ id: z.string(), to: z.string().optional() }))
    .returns(z.promise(evaluationSchema.or(z.undefined()))),
  saveEvaluation: z.function()
    .args(evaluationSchema)
    .returns(z.promise(z.any()))
})

export const sequencerClientSchema = z.object({
  loadInteractions: z.function()
    .args(
      z.object({
        id: z.string(),
        owner: z.string(),
        from: z.string().optional(),
        to: z.string().optional()
      })
    )
    .returns(z.promise(z.array(interactionSchema)))
})

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

  const GET_CONTRACTS_QUERY = `
  query GetContracts ($contractIds: [ID!]!) {
    transactions(ids: $contractIds) {
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
            query: GET_CONTRACTS_QUERY,
            variables: { contractIds: [id] }
          })
        })
          .then((res) => res.json())
          .then(transactionConnectionSchema.parse)
          .then(path(['data', 'transactions', 'edges', '0', 'node']))
      ))
}

/**
 * @typedef Env2
 * @property {fetch} fetch
 * @property {string} GATEWAY_URL
 *
 * @callback LoadTransactionData
 * @param {string} id - the id of the contract whose src is being loaded
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
}
