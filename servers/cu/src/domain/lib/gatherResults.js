import { fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { applySpec, compose, filter, map, mergeRight, pathOr, pipe, transduce } from 'ramda'

import { findEvaluationsSchema } from '../dal.js'
import { evaluationToCursor, maybeParseCursor } from '../utils.js'

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
export function gatherResultsWith (env) {
  const findEvaluations = fromPromise(findEvaluationsSchema.implement(env.findEvaluations))

  return (ctx) => {
    return of(ctx)
      .chain(maybeParseCursor('from'))
      .chain(maybeParseCursor('to'))
      .chain((ctx) => findEvaluations({
        processId: ctx.processId,
        from: ctx.from,
        to: ctx.to,
        sort: ctx.sort || ctx.from.sort || ctx.to.sort,
        limit: ctx.limit,
        onlyCron: ctx.onlyCron
      }))
      .map((evaluations) =>
        transduce(
          compose(
            /**
             * NOTE: this is redundant since we pass onlyCron above, which ought
             * to filter to evalutations we want.
             *
             * But having this is safe, and doesn't add a lot of overhead as part
             * of the transduce
             */
            filter((evaluation) => ctx.onlyCron ? !!evaluation.cron : true),
            map(applySpec({
              /**
               * Create the cursor that represents this evaluation,
               * so that it can be used for paginating results,
               *
               * or resuming from where was last read
               */
              cursor: (evaluation) => evaluationToCursor(evaluation, ctx.sort || ctx.from.sort || ctx.to.sort),
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
