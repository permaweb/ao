import { isNotNil } from 'ramda'
import { Resolved, of } from 'hyper-async'

import { chainEvaluationWith } from '../lib/chainEvaluation.js'
import { loadProcessWith } from '../lib/loadProcess.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { loadMessagesWith } from '../lib/loadMessages.js'
import { evaluateWith } from '../lib/evaluate.js'
import { hydrateMessagesWith } from '../lib/hydrateMessages.js'

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
  const loadProcess = loadProcessWith(env)
  const loadMessages = loadMessagesWith(env)
  const hydrateMessages = hydrateMessagesWith(env)
  const loadModule = loadModuleWith(env)
  const evaluate = evaluateWith(env)

  return ({ processId, messageId, to, ordinate, cron, exact, needsMemory }) => {
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

    return chainEvaluation({
      processId,
      messageId,
      to,
      ordinate,
      cron,
      exact,
      needsMemory,
      /**
       * The async that encapsulates the evaluation stream
       * to potentially chain.
       *
       * If an exact match is found, this will never unwrap
       * thus never performing the work
       */
      next: of({ id: processId, messageId, to, ordinate, cron, stats, needsMemory })
        .chain(loadProcess)
        .chain(loadModule)
        .chain(loadMessages)
        .chain(hydrateMessages)
        // { output }
        .chain(evaluate)
        .chain((ctx) => Resolved({
          ...ctx,
          result: ctx.output,
          from: ctx.last.timestamp,
          fromBlockHeight: ctx.last.blockHeight,
          ordinate: ctx.last.ordinate
        }))
        .bimap(logStats, logStats)
    })
  }
}
