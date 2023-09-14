import { fromPromise, of } from "hyper-async";
import { __, path } from "ramda";
import { z } from "zod";

export const interactionSchema = z.object({
  action: z.object({
    function: z.string(),
  }).passthrough(),
  sortKey: z.string(),
});

const cachedInteractionSchema = z.object({
  /**
   * The sort key of the interaction
   */
  sortKey: z.string().min(1),
  /**
   * the id of the contract that the interaction was performed upon
   */
  parent: z.string().min(1),
  /**
   * The date when this record was created, effectively
   * when this record was cached
   *
   * not to be confused with when the transaction was placed on chain
   */
  createdAt: z.preprocess(
    (
      arg,
    ) => (typeof arg == "string" || arg instanceof Date ? new Date(arg) : arg),
    z.date(),
  ),
  /**
   * The action performed by the interaction
   */
  action: z.record(z.any()),
  /**
   * The output received after applying the interaction
   * to the previous state.
   *
   * See https://github.com/ArweaveTeam/SmartWeave/blob/master/CONTRACT-GUIDE.md#contract-format-and-interface
   * for shape
   */
  output: z.object({
    state: z.record(z.any()).optional(),
    result: z.record(z.any()).optional(),
  }),
});

export const dbClientSchema = z.object({
  findLatestInteraction: z.function()
    .args(z.object({ id: z.string(), to: z.string().optional() }))
    .returns(z.promise(cachedInteractionSchema.or(z.undefined()))),
  saveInteraction: z.function()
    .args(cachedInteractionSchema)
    .returns(z.promise(z.any())),
});

export const sequencerClientSchema = z.object({
  loadInteractions: z.function()
    .args(
      z.object({
        id: z.string(),
        from: z.string(),
        to: z.string().optional(),
      }),
    )
    .returns(z.promise(z.array(interactionSchema))),
  // TODO: define this shape
  writeInteraction: z.function()
    .args(z.record(z.any()))
    .returns(z.promise(z.any())),
  signInteraction: z.function()
    .args(z.record(z.any()))
    .returns(z.promise(z.any())),
});

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
export function loadTransactionMetaWith({ fetch, GATEWAY_URL }) {
  // TODO: create a dataloader and use that to batch load contracts

  const GET_CONTRACTS_QUERY = `
  query GetContracts ($contractIds: [ID!]!) {
    transactions(ids: $contractIds) {
      edges {
        node {
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
export function loadTransactionDataWith({ fetch, GATEWAY_URL }) {
  // TODO: create a dataloader and use that to batch load contracts

  return (id) =>
    of(id)
      .chain(fromPromise((id) => fetch(`${GATEWAY_URL}/${id}`)));
}
