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
 * @property {string} messageUid - the transaction id of the message
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
      .chain((ctx) => {
        /**
         * The sort in either cursor takes precedent.
         *
         * If the sort does not exist in the cursor, meaning that a timestamp was used,
         * then use the provided sort.
         *
         * A flag can be set by the caller to override this behavior and instead prefer the top-lvl
         * provided sort
         *
         * Kind of hacky and not pretty but works for now. Prevents the caller from having to
         * parse the cursor.
         */
        let sort
        if (ctx.overrideCursorSort) {
          sort = ctx.sort ||
            pathOr(undefined, ['from', 'sort'], ctx) ||
            pathOr(undefined, ['to', 'sort'], ctx)
        } else {
          sort = pathOr(undefined, ['from', 'sort'], ctx) ||
            pathOr(undefined, ['to', 'sort'], ctx) ||
            ctx.sort
        }

        return findEvaluations({
          processId: ctx.processId,
          from: ctx.from,
          to: ctx.to,
          sort,
          limit: ctx.limit,
          onlyCron: ctx.onlyCron
        })
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
                /**
                 * Do not include evaluations that resulted in an error.
                 *
                 * TODO: not clear in spec whether a message, whose eval resulted in an error,
                 * may also place messages in the outbox to be pushed.
                 * In practice, this has not been the case, but we may want to clarify in the spec
                 *
                 * So for now, just filtering them out from gathered results.
                 */
                filter((evaluation) => !evaluation.output || !evaluation.output.Error),
                map(applySpec({
                  /**
                   * Create the cursor that represents this evaluation,
                   * so that it can be used for paginating results,
                   *
                   * or resuming from where was last read
                   */
                  cursor: (evaluation) => evaluationToCursor(evaluation, sort),
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
                      Assignments: pathOr([], ['Assignments']),
                      Spawns: pathOr([], ['Spawns']),
                      Output: pathOr(undefined, ['Output']),
                      Patches: pathOr([], ['Patches']),
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
      })
      .map(evaluations => ({ evaluations }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
