import { fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { applySpec, compose, filter, map, mergeRight, pathOr, pipe, prop, transduce } from 'ramda'

import { findEvaluationsSchema } from '../dal.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  evaluations: z.array(z.any())
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
            filter((evaluation) => !!evaluation.cron),
            map(applySpec({
              timestamp: prop('timestamp'),
              /**
               * Extract the Outbox as a result of evaluating the Cron Message
               */
              output: pipe(
                pathOr({}, ['output']),
                /**
                 * If there is no outbox, then simply return the Outbox identity:
                 * - Empty Messages
                 * - Empty Spawns
                 * - Nil Output
                 * - Nil Error
                 */
                applySpec({
                  Messages: pathOr([], ['Messages']),
                  Spawns: pathOr([], ['Spawns']),
                  Output: pathOr(undefined, ['Output']),
                  Error: pathOr(undefined, ['Error'])
                })
              )
            }))
          ),
          (acc, evaluation) => {
            acc.push(evaluation)
            return acc
          },
          [],
          evaluations
        )
      )
      .map(evaluations => ({ evaluations }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
