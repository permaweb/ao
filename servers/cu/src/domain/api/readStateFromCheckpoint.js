import { isNotNil, join, split } from 'ramda'
import { Resolved, of, fromPromise } from 'hyper-async'

import { chainEvaluationWith } from '../lib/chainEvaluation.js'
import { loadProcessWith } from '../lib/loadProcess.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { loadMessagesWith } from '../lib/loadMessages.js'
import { evaluateWith } from '../lib/evaluate.js'
import { hydrateMessagesWith } from '../lib/hydrateMessages.js'
import { loadProcessMetaWith } from '../lib/loadProcessMeta.js'

/**
 * We will maintain a Map of currently executing readState calls.
 *
 * If another request comes in to invoke a readState that is already
 * pending, then we will just return that one, instead of spinning up a new one
 *
 * @type {Map<string, { startTime: Date, pending: Promise<any> }}
 */
export const pendingReadState = new Map()
const removePendingReadState = (key) => (res) => {
  pendingReadState.delete(key)
  return res
}

export const pendingReadStates = () => Object.fromEntries(pendingReadState.entries())

export function readStateFromCheckpointWith (env) {
  env.pendingReadState = pendingReadState
  env.fromPendingKey = split(',')

  const loadProcessMeta = loadProcessMetaWith(env)
  const loadProcess = loadProcessWith(env)
  const loadMessages = loadMessagesWith(env)
  const hydrateMessages = hydrateMessagesWith(env)
  const loadModule = loadModuleWith(env)
  const evaluate = evaluateWith(env)

  // Checkpoint: { id, timestamp, ordinate, blockHeight, cron, assignmentId, hashChain, encoding }
  return ({ processId, messageId, to, ordinate, cron, needsOnlyMemory, checkpoint, Memory }) => {
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

    return of({ id: processId, messageId, to, ordinate, cron, stats, needsOnlyMemory, checkpoint, Memory })
        .chain(loadProcessMeta)
        .chain(loadProcess)
        .chain((ctx) => {
            return of(ctx)
                .chain(loadModule)
                .chain(loadMessages)
                .chain(hydrateMessages)
                .chain(evaluate)
                .chain((ctx) => Resolved({
                    ...ctx,
                    result: ctx.output,
                    from: ctx.last.timestamp,
                    fromBlockHeight: ctx.last.blockHeight,
                    ordinate: ctx.last.ordinate,
                    fromCron: ctx.last.cron
                }))
        })
        .bimap(logStats, logStats)
        .toPromise()

  }
}
