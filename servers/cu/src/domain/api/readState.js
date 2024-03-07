import { isNotNil, join } from 'ramda'
import { Resolved, fromPromise, of } from 'hyper-async'

import { findPendingForProcessBeforeWith } from '../utils.js'
import { loadProcessWith } from '../lib/loadProcess.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { loadMessagesWith } from '../lib/loadMessages.js'
import { evaluateWith } from '../lib/evaluate.js'
import { hydrateMessagesWith } from '../lib/hydrateMessages.js'

/**
 * We will maintain a Map of currently executing readState calls.
 *
 * If another request comes in to invoke a readState that is already
 * pending, then we will just return that Async instead of spinning up a new readState.
 *
 * @type {Map<string, { startTime: Date, pending: Promise<any> }}
 */
export const pendingReadState = new Map()
const pendingKey = join(',')
const removePending = (key) => (res) => {
  pendingReadState.delete(key)
  return res
}
const findPendingForProcessBefore = findPendingForProcessBeforeWith(pendingReadState)

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

    const key = pendingKey([processId, to, ordinate, cron, exact, needsMemory])
    if (!pendingReadState.has(key)) {
      let newEntry
      const pendingForProcessBefore = findPendingForProcessBefore({ processId, timestamp: to })
      /**
       * Determine whether we can chain off of a pending readState
       * eval stream
       */
      if (pendingForProcessBefore) {
        const [pendingKey, { pending, chainedTo }] = pendingForProcessBefore
        env.logger(
          'found pending readState at "%j" to chain to, for incoming readState "%s"',
          { key: pendingKey, chainedTo },
          key
        )
        newEntry = {
          startTime: new Date(),
          chainedTo: pendingKey,
          /**
           * chain off already pending readState, to start evaling
           * where it left off from
           *
           * @type {Promise}
           */
          pending
        }
      } else {
        newEntry = {
          startTime: new Date(),
          chainedTo: undefined,
          /**
           * Nothing to chain from, so just resolve
           */
          pending: Promise.resolve()
        }
      }

      pendingReadState.set(
        key,
        {
          startTime: newEntry.startTime,
          chainedTo: newEntry.chainedTo, // string (key) or undefined if not chained
          /**
           * chain off newEntry.start, then continue eval
           */
          pending: newEntry.pending.then(() =>
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
                  .chain((ctx) => Resolved({
                    ...ctx,
                    result: ctx.output,
                    from: ctx.last.timestamp,
                    fromBlockHeight: ctx.last.blockHeight,
                    ordinate: ctx.last.ordinate
                  }))
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
              .toPromise())
        }
      )
    }

    return of(key).chain(fromPromise((key) => pendingReadState.get(key).pending))
  }
}
