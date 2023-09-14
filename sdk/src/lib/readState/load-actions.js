import { of } from "hyper-async";
import { __, assoc } from "ramda";
import { z } from "zod";

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
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
 * @typedef LoadInteractionsArgs
 * @property {string} id - the contract id
 * @property {string} [from] - the lowermost sortKey
 * @property {string} [to] - the highest sortKey
 *
 * @callback LoadInteractions
 * @param {LoadInteractionsArgs} args
 * @returns {Async<z.infer<typeof inputSchema>}
 *
 * @typedef Env
 * @property {LoadInteractions} loadInteractions
 */

/**
 * @typedef LoadActionArgs
 * @property {string} id - the contract id
 * @property {string} [from] - the lowermost sortKey
 * @property {string} [to] - the highest sortKey
 *
 * @callback LoadActions
 * @param {LoadActionArgs} args
 * @returns {Async<LoadActionArgs & z.infer<typeof actionsSchema>>}
 *
 * @param {Env} env
 * @returns {LoadActions}
 */
export function loadActionsWith({ loadInteractions }) {
  return (ctx) =>
    of({ id: ctx.id, from: ctx.from, to: ctx.to })
      .chain(({ id, to, from }) => loadInteractions({ id, from, to }))
      .map(assoc("actions", __, ctx))
      .map(actionsSchema.parse);
}
