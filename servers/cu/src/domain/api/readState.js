import { Resolved, fromPromise, of } from 'hyper-async'

import { findEvaluationSchema } from '../dal.js'
import { loadProcessWith } from '../lib/loadProcess.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { loadMessagesWith } from '../lib/loadMessages.js'
import { evaluateWith } from '../lib/evaluate.js'
import { hydrateMessagesWith } from '../lib/hydrateMessages.js'

/**
 * @typedef State
 * @property {any} state
 * @property {any} result
 *
 * @typedef ReadStateArgs
 * @property {string} processId
 * @property {string} to
 *
 * @callback ReadState
 * @param {ReadStateArgs} args
 * @returns {Promise<State>} result
 *
 * @returns {ReadState}
 */
export function readStateWith (env) {
  const loadProcess = loadProcessWith(env)
  const loadMessages = loadMessagesWith(env)
  const hydrateMessages = hydrateMessagesWith(env)
  const loadModule = loadModuleWith(env)
  const evaluate = evaluateWith(env)

  const findEvaluation = fromPromise(findEvaluationSchema.implement(env.findEvaluation))

  return ({ processId, to, ordinate, cron, exact }) => {
    return of({ id: processId, to, ordinate, cron })
      .chain(loadProcess)
      .chain(res => {
        /**
         * The exact evaluation (identified by its input messages timestamp)
         * was found in the cache, so just return it.
         *
         * We perform a similar check below, but checking additionally here
         * prevents unecessarily loading the process wasm module and heap,
         * a non-trivial boon for system resources
         */
        if (res.from &&
            res.from === to &&
            res.ordinate === ordinate &&
            // eslint-disable-next-line eqeqeq
            res.cron == cron
        ) {
          env.logger(
            'Exact match to cached evaluation for message "%s:%s" to process "%s"',
            to,
            ordinate,
            processId
          )

          /**
           * evaluate sets output below, so since we've found the output
           * without evaluating, we simply set output to the result of the cached
           * evaluation.
           *
           * This exposes a single api for upstream to consume
           */
          return Resolved({ ...res, output: res.result })
        }

        return of(res)
          .chain(loadMessages)
          .chain(hydrateMessages)
          .chain(loadModule)
          // { output }
          .chain(evaluate)
          .chain((ctx) => {
            /**
             * Some upstream apis like readResult need an exact match on the message evaluation,
             * and pass the 'exact' flag
             *
             * If this flag is set, we ensure that by fetching the exact match from the db.
             * This hedges against race conditions where multiple requests are resulting in the evaluation
             * of the same messages in a process.
             *
             * Having this should allow readState to always start on the latestEvalutaion, relative to 'to',
             * and reduce the chances of unnecessary 409s, due to concurrent evalutions of the same messages,
             * across multiple requests.
             */
            if (exact) {
              return findEvaluation({ processId, to, ordinate, cron })
                /**
                 * Mirror output shape from loadProcess, using the exact evaluation
                 * as the "starting point"
                 */
                .map((evaluation) => ({
                  ...ctx,
                  output: evaluation.output,
                  from: evaluation.timestamp,
                  ordinate: evaluation.ordinate,
                  fromBlockHeight: evaluation.blockHeight,
                  evaluatedAt: evaluation.evaluatedAt
                }))
            }

            return Resolved(ctx)
          })
      })
  }
}
