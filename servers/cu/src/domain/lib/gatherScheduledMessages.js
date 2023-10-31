import { fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { assoc, compose, filter, map, mergeRight, pathOr, pipe, transduce } from 'ramda'

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
            filter(evaluation => evaluation.sortKey.split(',').length > 3),
            map(evaluation => pipe(
              /**
               * Extract the Outbox Messages as a result of evaluating the Scheduled Message
               */
              pathOr([], ['output', 'result', 'messages']),
              /**
               * The MU will need to know where to start from, so we attach the Scheduled Message's
               * "sortKey" to each of its Outbox Messages, for the MU to keep track of where it has subscribed
               * up to
               */
              map(assoc('scheduledSortKey', evaluation.sortKey))
            )(evaluation))
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
