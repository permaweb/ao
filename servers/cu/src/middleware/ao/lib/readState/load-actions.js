import { of } from 'hyper-async'
import { __, assoc } from 'ramda'
import { z } from 'zod'

import { interactionSchema } from '../../model.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  actions: z.array(interactionSchema)
}).passthrough()

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
 * @returns {Async<LoadActionArgs & z.infer<typeof ctxSchema>>}
 *
 * @param {Env} env
 * @returns {LoadActions}
 */
export function loadActionsWith ({ loadInteractions, logger: _logger }) {
  const logger = _logger.child('loadActions')

  return (ctx) =>
    of(ctx)
      .chain(loadInteractions)
      .map(assoc('actions', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Adding actions to ctx %O'))
}
