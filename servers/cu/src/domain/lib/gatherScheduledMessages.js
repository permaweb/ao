import { fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { compose, filter, map, mergeRight, pathOr, transduce } from 'ramda'

import { findEvaluationsSchema } from '../dal.js'

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

  const findEvaluations = fromPromise(findEvaluationsSchema.implement(env.findEvaluations))

  return (ctx) => {
    return of(ctx)
      .chain(ctx => findEvaluations({ processId: ctx.processId, from: ctx.from, to: ctx.to }))
      .map(evaluations =>
        transduce(
          compose(
            /**
             * scheduled messages have the interval and idx appended to their "sortKey"
             * and so can be distinguished by how many parts after splitting on ','
             */
            filter(evaluation => evaluation.sortKey.split(',').length > 4),
            map(pathOr([], 'output', 'result', 'messages'))
          ),
          (acc, messages) => {
            acc.push.apply(acc, messages)
            return acc
          },
          [],
          evaluations
        )
      )
      .map(messages => ({ messages }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
