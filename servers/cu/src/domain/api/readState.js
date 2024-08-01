import { isNotNil } from 'ramda'
import { Resolved, of, fromPromise } from 'hyper-async'

import { chainEvaluationWith } from '../lib/chainEvaluation.js'
import { loadProcessWith } from '../lib/loadProcess.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { loadMessagesWith } from '../lib/loadMessages.js'
import { evaluateWith } from '../lib/evaluate.js'
import { hydrateMessagesWith } from '../lib/hydrateMessages.js'
import { loadProcessMetaWith } from '../lib/loadProcessMeta.js'

export { pendingReadStates } from '../lib/chainEvaluation.js'

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
  const chainEvaluation = chainEvaluationWith(env)
  const loadProcessMeta = loadProcessMetaWith(env)
  const loadProcess = loadProcessWith(env)
  const loadMessages = loadMessagesWith(env)
  const hydrateMessages = hydrateMessagesWith(env)
  const loadModule = loadModuleWith(env)
  const evaluate = evaluateWith(env)

  return ({ processId, messageId, to, ordinate, cron, exact, needsMemory, dryRun = false }) => {
    messageId = messageId || [to, ordinate, cron].filter(isNotNil).join(':') || 'latest'

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

    /**
     * The potential Promise that encapsulates the evaluation stream
     * for this readState
     *
     * If no additional evaluation stream is warranted ie. a cached output,
     * or an already pending identical evaluation stream, then the below chain
     * is never executed, and so no additional work is performed
     */
    let pending
    function next () {
      if (!pending) {
        /**
         * The Async is forked into a Promise, which then wrapped
         * into another Async.
         *
         * Since there is only one instance of the underlying Promise,
         * there is only one instance of the work used to resolve each Async,
         * every time, thus preventing duplication of work
         */
        pending = of({ id: processId, messageId, to, ordinate, cron, stats, needsMemory, dryRun })
          .chain(loadProcessMeta)
          .chain(loadProcess)
          .chain(loadModule)
          .chain(loadMessages)
          .chain(hydrateMessages)
          .chain(evaluate)
          .chain((ctx) => Resolved({
            ...ctx,
            result: ctx.output,
            from: ctx.last.timestamp,
            fromBlockHeight: ctx.last.blockHeight,
            ordinate: ctx.last.ordinate
          }))
          .bimap(logStats, logStats)
          .toPromise()
      }

      return pending
    }

    return chainEvaluation({
      processId,
      messageId,
      to,
      ordinate,
      cron,
      exact,
      needsMemory,
      next: of().chain(fromPromise(next))
    })
  }
}
