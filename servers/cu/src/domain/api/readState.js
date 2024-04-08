import { isNotNil, join } from 'ramda'
import { Resolved, fromPromise, of } from 'hyper-async'

import { findPendingForProcessBeforeWith, isLaterThan } from '../utils.js'
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
const pendingReadState = new Map()
const pendingKey = join(',')
const removePending = (key) => (res) => {
  pendingReadState.delete(key)
  return res
}

export function pendingReadStates () {
  return Object.fromEntries(pendingReadState.entries())
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

    return of(pendingKey([processId, to, ordinate, cron, exact, needsMemory]))
      .chain((key) => {
        /**
         * Already pending evaluation, so just return its eval stream
         */
        if (pendingReadState.has(key)) return of(key).chain(fromPromise((key) => pendingReadState.get(key).pending))

        /**
        * Determine whether to:
        * - return the exact match if found
        * - chain off an existing evaluation stream
        * - start a brand new evaluation stream
        */
        return of({ id: processId, messageId, to, ordinate, cron, stats, needsMemory })
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

            /**
             * Often times, multiple requests will be sent to eval the same message,
             * So before we duplicate work, we double-check if there is a pending readState.
             *
             * A bit clunky, but helps prevent duplicate work, due to both requests coming
             * in before the process could be loaded
             */
            if (pendingReadState.has(key)) return of(key).chain(fromPromise((key) => pendingReadState.get(key).pending))

            /**
            * Check if the starting point found in caching layers
            * is earlier than a pending eval stream, and simply
            * chain off the pending eval stream if so.
            *
            * Otherwise, we start a separate evaluation stream using the
            * starting point from the cache.
            *
            * This will help ensure a request to evaluate an old message
            * does not cause delays on evaluations of newer messages that may
            * have later checkpoints available on chain to "hot start" from.
            */
            let newEntry

            const pendingForProcessBefore = findPendingForProcessBefore({ processId, timestamp: to })
            if (pendingForProcessBefore) {
              const [pendingKey, { pending, chainedTo }] = pendingForProcessBefore
              const [, pTo, pOrdinate, pCron] = pendingKey.split(',')

              const isPendingLaterThanCached = !!res.from && isLaterThan(
                { timestamp: res.from, ordinate: res.ordinate, cron: res.fromCron },
                { timestamp: pTo, ordinate: pOrdinate, cron: pCron }
              )

              if (isPendingLaterThanCached) {
                env.logger(
                  'found pending readState at "%j" to chain to, later than cached %j, for incoming readState "%s"',
                  { key: pendingKey, chainedTo },
                  res.from
                    ? { timestamp: res.from, ordinate: res.ordinate, cron: res.fromCron }
                    : { COLD_START: true },
                  key
                )
                newEntry = {
                  startTime: new Date(),
                  chainedTo: pendingKey,
                  /**
                  * chain off already pending readState,
                  * then call loadProcess to match expected shape
                  * whether new eval stream, or chaining on existing eval stream
                  *
                  * Unwrapping here to prevent duplicate work,
                  * as a result of the same Async being forked twice.
                  * It is still wrapped in an Async below, but it's the same
                  * underlying Promise, so no duplicate work
                  *
                  * @type {Promise}
                  */
                  pending: pending
                    .then(() =>
                      of({ id: processId, messageId, to, ordinate, cron, stats, needsMemory })
                        .chain(loadProcess)
                        .toPromise())
                }
              }
            }

            if (!newEntry) {
              newEntry = {
                startTime: new Date(),
                chainedTo: undefined,
                /**
                  * Nothing to chain from, so just resolve what was returned
                  * from loadProcess to continue the current work
                  */
                pending: Promise.resolve(res)
              }
            }

            /**
             * Add the entry to the pending readStates
             */
            pendingReadState.set(key, {
              startTime: newEntry.startTime,
              chainedTo: newEntry.chainedTo,
              pending: newEntry.pending
                .then((res) =>
                  of(res)
                    .chain((res) => {
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
                      * Unwrapping here to prevent duplicate work,
                      * as a result of the same Async being forked twice.
                      * It is still wrapped in an Async below, but it's the same
                      * underlying Promise, so no duplicate work
                      *
                      * The only other place toPromise is used is on clients, routes (edges),
                      * and evaluate (to prevent callstack overflow)
                      */
                    .toPromise()
                )
            })

            /**
             * Return an Async wrapping the actual promise, so minimal
             * duplicate work is performed
             */
            return of(key).chain(fromPromise((key) => pendingReadState.get(key).pending))
          })
      })
  }
}
