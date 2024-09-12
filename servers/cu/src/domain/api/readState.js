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

export function readStateWith (env) {
  env.pendingReadState = pendingReadState
  env.fromPendingKey = split(',')

  const chainEvaluation = chainEvaluationWith(env)
  const loadProcessMeta = loadProcessMetaWith(env)
  const loadProcess = loadProcessWith(env)
  const loadMessages = loadMessagesWith(env)
  const hydrateMessages = hydrateMessagesWith(env)
  const loadModule = loadModuleWith(env)
  const evaluate = evaluateWith(env)

  return ({ processId, messageId, to, ordinate, cron, needsOnlyMemory }) => {
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

    const key = join(',', [processId, to, ordinate, cron, needsOnlyMemory])

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
      if (pending) return pending

      /**
       * The Async is forked into a Promise, which then wrapped
       * into another Async.
       *
       * Since there is only one instance of the underlying Promise,
       * there is only one instance of the work used to resolve each Async,
       * every time, thus preventing duplication of work
       */
      pending = of({ id: processId, messageId, to, ordinate, cron, stats, needsOnlyMemory })
        .chain(loadProcessMeta)
        .chain(loadProcess)
        .chain((ctx) => {
          /**
           * An exact match was found, either a cached evaluation
           * or the cache memory needed. So just return it without
           * spinning up a new eval stream.
           *
           * The shape of ctx should match the below shape at the end
           * of an eval stream, which loadProcess does
           */
          if (ctx.exact) return Resolved({ ...ctx, result: ctx.result, output: ctx.result })

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

      return pending
    }

    return chainEvaluation({ pendingKey: key, processId, messageId, to, ordinate, cron, needsOnlyMemory })
      .map(([isNewEntry, res]) => {
        if (!isNewEntry) return res

        /**
         * New evaluations must be performed, so place it
         * in the map of pendingReadStates, and chain the new work to be performed
         * off of the pending work, then clean up by removing itself from the map
         */
        const newEntry = {
          startTime: res.startTime,
          chainedTo: res.chainedTo,
          pending: res.pending
            .then(next)
            .finally(removePendingReadState(key))
        }
        pendingReadState.set(key, newEntry)

        return newEntry
      })
      .chain(fromPromise((res) => res.pending))
  }
}
