import { Resolved, fromPromise, of } from 'hyper-async'

import { findEvaluationSchema } from '../dal.js'
import { loadProcessWith } from '../lib/loadProcess.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { loadMessagesWith } from '../lib/loadMessages.js'
import { evaluateWith } from '../lib/evaluate.js'
import { hydrateMessagesWith } from '../lib/hydrateMessages.js'
import { isNotNil, join } from 'ramda'

/**
 * We will maintain a Map of currently executing readState calls.
 *
 * If another request comes in to invoke a readState that is already
 * pending, then we will just return that Async instead of spinning up a new readState.
 */
const pendingReadState = new Map()
const pendingKey = join(',')
const removePending = (key) => (res) => {
  pendingReadState.delete(key)
  return res
}

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

  return ({ processId, messageId, to, ordinate, cron, exact, needsMemory }) => {
    messageId = messageId || [to, ordinate, cron].filter(isNotNil).join(':') || 'earliest'

    const stats = {
      startTime: new Date(),
      endTime: undefined,
      messages: {
        scheduled: 0,
        cron: 0
      }
    }

    const logStats = (res) => {
      stats.endTime = new Date()
      env.logger(
        'readState for process "%s" up to message "%s" took %d milliseconds: %j',
        processId,
        messageId,
        stats.endTime - stats.startTime,
        stats
      )

      return res
    }

    const key = pendingKey([processId, to, ordinate, cron, exact, needsMemory])
    if (!pendingReadState.has(key)) {
      pendingReadState.set(
        key,
        of({ id: processId, messageId, to, ordinate, cron, stats, needsMemory })
          .chain(loadProcess)
          .chain((res) => {
            /**
             * The exact evaluation (identified by its input messages timestamp)
             * was found in the cache, so just return it.
             *
             * evaluate sets output below, so since we've found the output
             * without evaluating, we simply set output to the result of the cached
             * evaluation.
             *
             * This exposes a single api for upstream to consume
             */
            if (res.exact) return Resolved({ ...res, output: res.result })

            return of(res)
              .chain(loadModule)
              .chain(loadMessages)
              .chain(hydrateMessages)
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
          .bimap(logStats, logStats)
          /**
           * Always remove the pending work, when it's complete
           */
          .bimap(removePending(key), removePending(key))
          /**
           * TODO: Need to figure out how to push this to the edge.
           *
           * Unwrapping here to prevent duplicate work,
           * as a result of the same Async being forked twice.
           * It is still wrapped in an Async below, but it's the same
           * underlying Promise, so no duplicate work
           *
           * Need to figure out how to push this to the edge.
           *
           * The only other place toPromise is used is on clients, routes (edges),
           * and evaluate (to prevent callstack overflow)
           */
          .toPromise()
      )
    }

    return of(key).chain(fromPromise((key) => pendingReadState.get(key)))
  }
}
