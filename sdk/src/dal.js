import { fromPromise, of } from "hyper-async";
import { path } from "ramda";
import { z } from "zod";

const GET_CONTRACTS_QUERY = `
query GetContracts ($contractIds: [ID!]!) {
  transactions(ids: $contractIds) {
    edges {
      node {
        tags {
          name
          value
        }
      }
    }
  }
}`;

const transactionConnectionSchema = z.object({
  data: z.object({
    transactions: z.object({
      edges: z.array(z.object({
        node: z.record(z.any()),
      })),
    }),
  }),
});

/**
 * @typedef Env
 * @property {fetch} fetch
 * @property {string} GATEWAY_URL
 */

/**
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<z.infer<typeof transactionConnectionSchema>['data']['transactions']['edges'][number]['node']>}
 *
 * @param {Env} env
 * @returns {LoadTransactionMeta}
 */
export function loadTransactionMetaWith({ fetch, GATEWAY_URL }) {
  // TODO: create a dataloader and use that to batch load contracts

  return (id) =>
    of(id)
      .chain(fromPromise((id) =>
        fetch(`${GATEWAY_URL}/graphql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: GET_CONTRACTS_QUERY,
            variables: { contractIds: [id] },
          }),
        })
          .then((res) => res.json())
          .then(transactionConnectionSchema.parse)
          .then(path(["data", "transactions", "edges", "0", "node"]))
      ));
}

/**
 * @callback LoadTransactionData
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<Response>}
 *
 * @param {Env} env
 * @returns {LoadTransactionData}
 */
export function loadTransactionDataWith({ fetch, GATEWAY_URL }) {
  // TODO: create a dataloader and use that to batch load contracts

  return (id) =>
    of(id)
      .chain(fromPromise((id) => fetch(`${GATEWAY_URL}/${id}`)));
}
