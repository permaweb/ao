import { fromPromise } from 'hyper-async'
import { z } from 'zod'
import { mergeRight, pathOr } from 'ramda'

import { findScheduledEvaluationsSchema } from '../dal.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  messages: z.array(z.any())
}).passthrough()

/**
 * @typedef Args
 * @property {string} messageTxId - the transaction id of the message
 *
 * @typedef Result
 * @property {any[]} messages - the array of scheduled messages over the interval
 *
 * @callback GatherScheduledMessages
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {GatherScheduledMessages}
 */
export function gatherScheduledMessagesWith (env) {
  const logger = env.logger.child('loadMessageMeta')
  env = { ...env, logger }

  const findScheduledEvaluations = fromPromise(findScheduledEvaluationsSchema.implement(env.findScheduledEvaluations))

  return (ctx) => {
    return findScheduledEvaluations({ processId: ctx.processId, from: ctx.from, to: ctx.to })
      .map(evaluations => evaluations.flatMap(pathOr([], ['output', 'result', 'messages'])))
      .map(messages => ({ messages }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
