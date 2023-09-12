import { __, assoc, assocPath, prop, reduce, reduced } from "ramda";
import { fromPromise, of, Rejected, Resolved } from "hyper-async";
import HyperbeamLoader from "@permaweb/hyperbeam-loader";
import { z } from "zod";

const outputSchema = z.object({
  output: z.record(z.any()),
});

/**
 * @typedef Env
 * @property {any} db
 */

function addHandler(ctx) {
  return of(ctx.src)
    .map(HyperbeamLoader)
    .map((handle) => ({ handle, ...ctx }));
}

function cacheInteractionWith({ db }) {
  return (interactions) => db.saveInteraction(interactions);
}

/**
 * @typedef EvaluateArgs
 * @property {string} id - the contract id
 * @property {Record<string, any>} state - the initial state
 * @property {string} from - the initial state sortKey
 * @property {ArrayBuffer} src - the contract wasm as an array buffer
 * @property {Record<string, any>[]} action - an array of interactions to apply
 * @property {any} SWGlobal
 *
 * @callback Evaluate
 * @param {EvaluateArgs} args
 * @returns {Async<z.infer<typeof outputSchema>}
 *
 * @param {Env} env
 * @returns {Evaluate}
 */
export function evaluateWith(env) {
  const cacheInteraction = cacheInteractionWith(env);

  return (ctx) =>
    of(ctx)
      .chain(addHandler)
      .chain((ctx) =>
        reduce(
          /**
           * See load-actions for incoming shape
           */
          ($output, { action, sortKey }) =>
            $output
              .map(prop("state"))
              .chain((state) =>
                of(state)
                  .chain(fromPromise((state) =>
                    ctx.handle(state, action, ctx.SWGlobal)
                  ))
                  .bichain(
                    /**
                     * Map thrown error to a result.error
                     */
                    (err) =>
                      Resolved(assocPath(["result", "error"], err, {})),
                    Resolved,
                  )
                  .chain((output) => {
                    if (output.result && output.result.error) {
                      return Rejected(output);
                    }
                    /**
                     * if output contains state, then the input state will
                     * simply be overwritten
                     */
                    return Resolved({ state, ...output });
                  })
              )
              /**
               * Create a new interaction to be cached in the local db
               */
              .chain((output) =>
                cacheInteraction({
                  id: sortKey,
                  parent: ctx.id,
                  action,
                  output,
                  createdAt: new Date(),
                }).map(() => output)
              )
              .bichain(
                /**
                 * An error was encountered, so stop reduce and return the output
                 */
                (err) => Resolved(reduced(err)),
                /**
                 * Return the output
                 */
                Resolved,
              ),
          of({ state: ctx.state }),
          ctx.actions,
        )
      )
      .map(assoc("output", __, ctx))
      .map(outputSchema.parse);
}
