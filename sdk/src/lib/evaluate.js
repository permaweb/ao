import {
  __,
  assoc,
  last,
  path,
  pipe,
  pipeWith,
  prop,
  reduce,
  unapply,
} from "ramda";
import { fromPromise, of } from "hyper-async";
import HyperbeamLoader from "@permaweb/hyperbeam-loader";

/**
 * @param  {...() => Promise<any>} fns - variadic args of functions
 * @returns a pipeP function that can be used to compose Promise returning functions,
 * similar to calling .then or .chain
 */
const pipeP = unapply(pipeWith((fn, p) => Promise.resolve(p).then(fn)));

/**
 * @callback Evaluate
 * @param {string} id - the id of the transaction
 * @returns {Async<z.infer<typeof inputSchema>}
 *
 * @typedef Env
 * @property {Evaluate} loadInteractions
 */

function addHandler(ctx) {
  return of(ctx.src)
    .chain(fromPromise(HyperbeamLoader))
    .map((handle) => ({ handle, ...ctx }));
}

function cacheInteractionsWith({ db }) {
  return (interactions) => db.saveInteractions(interactions);
}

/**
 * @callback LoadInteractions
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<string>}
 *
 * @param {Env} env
 * @returns {Evaluate}
 */
export function evaluateWith(env) {
  const cacheInteractions = cacheInteractionsWith(env);

  return (ctx) =>
    of({
      id: ctx.id,
      from: ctx.from,
      state: ctx.state,
      createdAt: ctx.createdAt,
      actions: ctx.actions,
      src: ctx.src,
    })
      .chain(addHandler)
      .chain(fromPromise(
        (
          {
            id: contractId,
            from: initialSortKey,
            state: initialState,
            createdAt,
            actions,
            handle,
          },
        ) =>
          reduce(
            /**
             * See load-actions for incoming shape
             */
            async (interactions, { action, sortKey }) =>
              pipeP(
                /**
                 * Extract the last interaction applied
                 *
                 * [..., { id, output, ... }]
                 */
                last,
                /**
                 * Extract the state from the output
                 *
                 * TODO: what if the output of the interaction
                 * is only messages and no state? Should evaluation use the state
                 * from the previous interaction? Doesn't that break encapsulation?
                 *
                 * I'm thinking that state will always need to be returned from an interaction,
                 * and then potentially messages. This way, when the messages are processed by a separate contract
                 * and produce interactions with this contract being evaluated, the fold can be performed.
                 *
                 * If an interaction only produces messages, then it should
                 * effectively act as an identity function for state (this can be abstracted away
                 * by messages lib).
                 *
                 * For now, we will assume state is always output. This ensures
                 * the evaluation can continue.
                 *
                 * { output: { state, result } }
                 */
                path(["output", "state"]),
                /**
                 * Perform the current interaction
                 *
                 * { input: '...', ... }
                 */
                (state) => handle(state, action, ctx.SWGlobal),
                /**
                 * Create a new interaction to be cached in the local db
                 *
                 * { state, result }
                 */
                (output) => ({
                  id: sortKey,
                  contractId,
                  output,
                  createdAt: new Date(),
                }),
                /**
                 * We purposefully do not create a new array every time here,
                 * and instead mutate a single array.
                 *
                 * Because we could potentially be evaluating lots of interactions,
                 * additional GC churn could slow down this process, non-trivially.
                 */
                (interaction) => {
                  interactions.push(interaction);
                  return interactions;
                },
              ),
            /**
             * We initialize the reduce with the initial state
             * we are starting our fold, either the initial contract state
             * retrieved from Arweave, or the most recent state cached.
             *
             * (See load-state.js)
             */
            Promise.resolve([{
              id: initialSortKey,
              contractId,
              output: initialState,
              /**
               * Depending on whether this initial state was already cached in the local db
               * set the createdAt
               */
              createdAt: createdAt || new Date(),
            }]),
            actions,
          ),
      ))
      /**
       * Cache all interactions in the local db,
       * so we won't need to evaluate them again
       */
      .chain(cacheInteractions)
      /**
       * [..., { id, output, ... }]
       */
      .map(pipe(
        last,
        prop("output"),
        assoc("output", __, ctx),
      ));
}
