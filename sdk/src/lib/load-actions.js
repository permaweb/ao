import { of } from "hyper-async";
import { __, assoc } from "ramda";
import { z } from "zod";

const actionsSchema = z.object({
  actions: z.array(
    z.object({
      action: z.object({
        function: z.string(),
      }).passthrough(),
      sortKey: z.string(),
    }),
  ),
}).passthrough();

/**
 * @callback LoadInteractions
 * @param {string} id - the id of the transaction
 * @returns {Async<z.infer<typeof inputSchema>}
 *
 * @typedef Env
 * @property {LoadInteractions} loadInteractions
 */

/**
 * @callback LoadInteractions
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<string>}
 *
 * @param {Env} env
 * @returns {LoadInteractions}
 */
export function loadActionsWith({ loadInteractions }) {
  return (ctx) =>
    of({ id: ctx.id, from: ctx.from, to: ctx.to })
      .chain(({ id, to, from }) => loadInteractions({ id, from, to }))
      .map(assoc("actions", __, ctx))
      .map(actionsSchema.parse);
}
