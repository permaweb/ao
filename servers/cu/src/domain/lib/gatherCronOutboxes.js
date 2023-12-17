import { fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { applySpec, compose, defaultTo, filter, map, mergeRight, path, pathOr, pipe, transduce } from 'ramda'

import { findEvaluationsSchema } from '../dal.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  outboxes: z.array(z.any())
}).passthrough()

/**
 * @typedef Args
 * @property {string} messageTxId - the transaction id of the message
 *
 * @typedef Result
 * @property {any[]} messages - the array of cron messages over the interval
 *
 * @callback GatherCronMessages
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {GatherCronMessages}
 */
export function gatherCronOutboxesWith (env) {
  const findEvaluations = fromPromise(findEvaluationsSchema.implement(env.findEvaluations))

  return (ctx) => {
    return of(ctx)
      .chain(ctx => findEvaluations({ processId: ctx.processId, from: ctx.from, to: ctx.to }))
      .map(evaluations =>
        transduce(
          compose(
            /**
             * Evaluations from a Cron message have a flag set indicating they it
             * came from a Cron message
             * 
             * so filter out all evalations that did not result from a Cron Message
             */
            filter((evaluation) => evaluation.isCron),
            /**
             * Extract the Outbox as a result of evaluating the Cron Message
             */
            map(path(['output'])),
            map(pipe(
              defaultTo({}),
              applySpec({
                Messages: pathOr([], ['Messages']),
                Spawns: pathOr([], ['Spawns']),
                Output: pathOr(undefined, ['Output']),
                Error: pathOr(undefined, ['Error'])
              })
            ))
          ),
          (acc, outbox) => {
            acc.push(outbox)
            return acc
          },
          [],
          evaluations
        )
      )
      .map(outboxes => ({ outboxes }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
