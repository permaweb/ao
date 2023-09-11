import { fromPromise, of, Rejected, Resolved } from "hyper-async";
import {
  __,
  always,
  applySpec,
  assoc,
  compose,
  evolve,
  head,
  map,
  path,
  pipe,
  prop,
  reduce,
  transduce,
} from "ramda";
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

const interactionsPageSchema = z.object({
  paging: z.record(z.any()),
  interactions: z.array(z.object({
    interaction: z.object({
      tags: z.array(z.object({
        name: z.string(),
        value: z.string(),
      })),
      block: z.object({
        id: z.string(),
        /**
         * These come back as strings from the sequencer
         * despite the values actually being numbers
         * on the graph
         *
         * So we will coerce them to a number
         */
        height: z.coerce.number(),
        timestamp: z.coerce.number(),
      }),
      sortKey: z.string(),
    }),
  })),
});

const interactionSchema = z.object({
  action: z.object({
    function: z.string(),
  }).passthrough(),
  sortKey: z.string(),
});

const cachedInteractionSchema = z.object({
  /**
   * The sort key of the interaction
   */
  id: z.string().min(1),
  /**
   * the id of the contract that the interaction was performed upon
   */
  contractId: z.string().min(1),
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

const cachedInteractionDocSchema = cachedInteractionSchema.omit({ id: true })
  .extend({
    _id: z.string().min(1),
    type: z.literal("interaction"),
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

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} SEQUENCER_URL
 *
 * @typedef LoadInteractionsArgs
 * @property {string} id - the contract id
 * @property {string} from - the lower-most block height
 * @property {string} to - the upper-most block height
 *
 * @callback LoadInteractions
 * @param {LoadInteractionsArgs} args
 * @returns {Async<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {LoadInteractions}
 */
export function loadInteractionsWith({ fetch, SEQUENCER_URL }) {
  // TODO: create a dataloader and use that to batch load interactions

  /**
   * Pad the block height portion of the sortKey to 12 characters
   *
   * This should work to increment and properly pad any sort key:
   * - 000001257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (full Sequencer sort key)
   * - 000001257294,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (Smartweave protocol sort key)
   * - 1257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (missing padding)
   * - 1257294 (just block height)
   *
   * @param {string} sortKey - the sortKey to be padded. If the sortKey is of sufficient length, then no padding
   * is added.
   */
  const padBlockHeight = (sortKey) => {
    if (!sortKey) return sortKey;
    const [height, ...rest] = String(sortKey).split(",");
    return [height.padStart(12, "0"), ...rest].join(",");
  };

  const mapBounds = evolve({
    from: padBlockHeight,
    to: pipe(
      /**
       * Potentially increment the block height by 1, so
       * the sequencer will include any interactions in that block
       */
      (sortKey) => {
        if (!sortKey) return sortKey;
        const parts = String(sortKey).split(",");
        /**
         * Full sort key, so no need to increment
         */
        if (parts.length > 1) return parts.join(",");

        /**
         * only the block height is being used as the sort key
         */
        const [height] = parts;
        if (!height) return height;
        const num = parseInt(height);
        return String(num + 1);
      },
      /**
       * Still ensure the proper padding is added
       */
      padBlockHeight,
    ),
  });

  /**
   * See https://academy.warp.cc/docs/gateway/http/get/interactions
   */
  return (ctx) =>
    of({ id: ctx.id, from: ctx.from, to: ctx.to })
      .map(mapBounds)
      .chain(fromPromise(({ id, from, to }) =>
        /**
         * A couple quirks to highlight here:
         *
         * - The sequencer returns interactions sorted by block height, DESCENDING order
         *   so in order to fold interactions, chronologically, we need to reverse the order of interactions
         *   prior to returning (see unshift instead of push in trasducer below)
         *
         * - The block height included in both to and from need to be left padded with 0's to reach 12 characters (See https://academy.warp.cc/docs/sdk/advanced/bundled-interaction#how-it-works)
         *   (see padBlockHeight above or impl)
         *
         * - 'from' is inclusive
         *
         * - 'to' is non-inclusive IF only the block height is used at the sort key, so if we want to include interactions in the block at 'to', then we need to increment the block height by 1
         *    (see mapBounds above where we increment to block height by one)
         */
        fetch(
          // TODO: need to be able to load multiple pages until all interactions are fetched
          `${SEQUENCER_URL}/gateway/v2/interactions-sort-key?contractId=${id}&from=${from}&to=${to}`,
        )
          .then((res) => res.json())
          .then(interactionsPageSchema.parse)
          .then(prop("interactions"))
          .then((interactions) =>
            transduce(
              // { interaction: { tags: [ { name, value }] } }
              compose(
                // [ { name, value } ]
                map(path(["interaction"])),
                map(applySpec({
                  sortKey: prop("sortKey"),
                  action: pipe(
                    path(["tags"]),
                    // { first: tag, second: tag }
                    reduce((a, t) => assoc(t.name, t.value, a), {}),
                    // "{\"function\": \"balance\"}"
                    prop("Input"),
                    // { function: "balance" }
                    (input) => JSON.parse(input),
                  ),
                })),
              ),
              (acc, input) => {
                acc.unshift(input);
                return acc;
              },
              [],
              interactions,
            )
          )
          .then(z.array(interactionSchema).parse)
      ));
}

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} SEQUENCER_URL
 *
 * @typedef LoadInteractionsArgs
 * @property {string} id - the contract id
 * @property {string} from - the lower-most block height
 * @property {string} to - the upper-most block height
 *
 * @callback LoadInteractions
 * @param {LoadInteractionsArgs} args
 * @returns {Async<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {LoadInteractions}
 */
export function writeInteractionWith({ fetch, SEQUENCER_URL }) {
  return (transaction) => {
    // verify input
    // construct request to sequencer ie. url, body, headers
    // make call
    // return shape that we care about
  };
}

export const dbWith = ({ dbClient }) => {
  function findLatestInteraction({ id, to }) {
    // TODO: implement to fetch from PouchDB. Mock for now
    return of([])
      .map(head)
      .chain((doc) => doc ? Resolved(doc) : Rejected(doc))
      /**
       * Ensure the input matches the expected
       * shape
       */
      .map(cachedInteractionDocSchema.parse)
      .map(applySpec({
        id: prop("_id"),
        contractId: prop("contractId"),
        output: prop("output"),
        createdAt: prop("createdAt"),
      }))
      /**
       * Ensure the output matches the expected
       * shape
       */
      .map(cachedInteractionSchema.parse)
      .bichain(Resolved, Resolved);
  }

  function saveInteractions(interactions) {
    return of(interactions)
      .map(
        (interactions) =>
          /**
           * Because we could potentially be transforming many interactions,
           * iterating the array multiple times could have a non-trivial
           * performance impact
           *
           * So we use a transducer which allows us to iterate the array
           * only once, performing all the transformations, per element, sequentially.
           *
           * Reduce + Transform => Transduce
           */
          transduce(
            compose(
              /**
               * Ensure the input matches the expected
               * shape
               */
              map(cachedInteractionSchema.parse),
              map(applySpec({
                _id: prop("id"),
                contractId: prop("contractId"),
                output: prop("output"),
                createdAt: prop("createdAt"),
                type: always("interaction"),
              })),
              /**
               * Ensure the output matches the expected
               * shape
               */
              map(cachedInteractionDocSchema.parse),
            ),
            /**
             * We purposefully do not create a new array every time here,
             * and instead mutate a single array.
             *
             * Because we could potentially be saving lots of interactions, so
             * additional GC churn could slow down this process, non-trivially.
             */
            (acc, input) => {
              acc.unshift(input);
              return acc;
            },
            [],
            interactions,
          ),
      ).chain((interactionDocs) => {
        // TODO: implement bulk save to PouchDB, mock for now
        return Resolved(interactionDocs);
      });
  }

  return {
    findLatestInteraction,
    saveInteractions,
  };
};
