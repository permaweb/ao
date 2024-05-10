import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { identity, join, pick } from 'ramda'

import { findEvaluationSchema } from '../dal.js'
import { findPendingForProcessBeforeWith, isLaterThan } from '../utils.js'

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
const removePendingReadState = (key) => (res) => {
  pendingReadState.delete(key)
  return res
}

export const pendingReadStates = () => Object.fromEntries(pendingReadState.entries())

const findPendingForProcessBefore = findPendingForProcessBeforeWith(pendingReadState)

function loadLatestEvaluationWith ({ findEvaluation, findLatestProcessMemory, logger }) {
  findEvaluation = fromPromise(findEvaluationSchema.implement(findEvaluation))
  // TODO: wrap in zod schemas to enforce contract
  findLatestProcessMemory = fromPromise(findLatestProcessMemory)

  function maybeExactEvaluation (ctx) {
    /**
     * We also need the Memory for the evaluation,
     * we need to either fetch from cache or perform an evaluation
     */
    if (ctx.needsMemory) return Rejected(ctx)

    return findEvaluation({
      processId: ctx.id,
      to: ctx.to,
      ordinate: ctx.ordinate,
      cron: ctx.cron
    })
      .map((evaluation) => {
        logger(
          'Exact match to cached evaluation for message to process "%s": %j',
          ctx.id,
          pick(['messageId', 'ordinate', 'cron', 'timestamp', 'blockHeight'], evaluation)
        )

        return {
          result: evaluation.output,
          from: evaluation.timestamp,
          ordinate: evaluation.ordinate,
          fromBlockHeight: evaluation.blockHeight,
          fromCron: evaluation.cron,
          exact: true
        }
      })
      .bimap(() => ctx, identity)
  }

  function maybeCachedMemory (ctx) {
    return findLatestProcessMemory({
      processId: ctx.id,
      timestamp: ctx.to,
      ordinate: ctx.ordinate,
      cron: ctx.cron,
      /**
       * Do not load the actual process memory,
       * since we're only intereseted in whether or
       * the cached memory (LRU -> File -> Arweave)
       * is later than a pending readState
       *
       * TODO: maybe we can detect whether
       * we need to omit memory or not based on the
       * presence of a pending readState
       */
      omitMemory: true
    })
      .bimap(
        (err) => {
          if (err.status !== 425) return err

          const id = ctx.ordinate
            ? `at nonce ${ctx.ordinate}`
            : `at timestamp ${ctx.to}`

          return {
            status: 425,
            message: `message ${id} not found cached, and earlier than latest known nonce ${err.ordinate}`
          }
        },
        identity
      )
      .map((found) => {
        const exact = found.timestamp === ctx.to &&
            found.ordinate === ctx.ordinate &&
            found.cron === ctx.cron

        return {
          isColdStart: found.src === 'cold_start',
          result: {
            Memory: found.Memory
          },
          from: found.timestamp,
          ordinate: found.ordinate,
          fromBlockHeight: found.blockHeight,
          fromCron: found.cron,
          exact
        }
      })
  }

  return (ctx) => maybeExactEvaluation(ctx)
    .bichain(maybeCachedMemory, Resolved)
}

/**
 * @typedef Args
 * @property {string} id - the id of the process
 *
 * @typedef Result
 * @property {string} id - the id of the process
 * @property {string} owner
 * @property {any} tags
 * @property {{ height: number, timestamp: number }} block
 *
 * @callback LoadProcess
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {LoadProcess}
 */
export function chainEvaluationWith (env) {
  const logger = env.logger.child('chainEvaluation')
  env = { ...env, logger }

  const loadLatestEvaluation = loadLatestEvaluationWith(env)

  /**
   * Check whether any evaluation chaining can be performed,
   * potentially reducing duplicated work.
   *
   * Depending on the pending readState operations,
   * this Async could either immediately resolve (nothing to chain on), or resolve
   * only once another eval stream is complete.
   *
   * When the latter happens, this eval stream is said to be "chainedTo"
   * the pending evaluation stream.
   */
  return ({ processId, to, ordinate, cron, exact, needsMemory, next }) => {
    const key = pendingKey([processId, to, ordinate, cron, exact, needsMemory])

    return of(key)
      .chain((key) => {
        /**
         * Already pending evaluation, so just return its eval stream
         */
        if (pendingReadState.has(key)) return of(key).chain(fromPromise((key) => pendingReadState.get(key).pending))

        const pendingForProcessBefore = findPendingForProcessBefore({ processId, timestamp: to })
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
          *
          * By default, there is nothing to chain off of, so just resolve immediately
          */
        let newEntry = {
          startTime: new Date(),
          chainedTo: undefined,
          pending: Promise.resolve()
        }

        /**
         * No pending readState, so no reason to check cache in order
         * to compare to a pending readState
         */
        if (!pendingForProcessBefore) return Resolved(newEntry)

        return loadLatestEvaluation({ id: processId, to, ordinate, cron, exact, needsMemory })
          .chain((res) => {
            /**
              * The exact evaluation (identified by its input messages timestamp)
              * was found in the cache, so just return it.
              *
              * evaluate sets output below, so since we've found the output
              * without evaluating, we simply set output to the result of the cached
              * evaluation.
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

            const [pendingKey, { pending, chainedTo }] = pendingForProcessBefore
            const [, pTo, pOrdinate, pCron] = pendingKey.split(',')

            /**
             * If the incoming eval stream will be cold started,
             * then we chain it to ANY pending eval stream. This is to
             * prevent multiple cold starts of the same process. This could mean that, in some cases,
             * a message eval from a cold start could "wait" unnecessarily longer (ie. the pending is evaluating
             * up to a much later message than the one being requested). To that, there are two points:
             *
             * 1. the request to eval an old message ought to be dispreferred anyway
             * 2. the old message will be in the CUs result cache, and so immediately
             * be returned to the client, without starting another eval stream, a boon for the CU.
             *
             * Regardless, this branch should only trigger when there is a process with a lengthy eval stream from a cold start,
             * and most of the time cold starts happen only for new processes, whose message history is short, and typically cheaper
             * to compute.
             *
             * ---
             *
             * Alternatively (not a cold start), we must compare the actual chronology
             * between the loaded latest evaluation and the found
             * pending readState, and decide whether it is advantageous to chain
             */
            const isPendingLaterThanCached = res.isColdStart || (!!res.from && isLaterThan(
              { timestamp: res.from, ordinate: res.ordinate, cron: res.fromCron },
              { timestamp: pTo, ordinate: pOrdinate, cron: pCron }
            ))

            if (isPendingLaterThanCached) {
              env.logger(
                'found pending readState at "%j" to chain to, later than cached %j, for incoming readState "%s"',
                { key: pendingKey, chainedTo },
                !res.isColdStart
                  ? { timestamp: res.from, ordinate: res.ordinate, cron: res.fromCron }
                  : { COLD_START: true },
                key
              )
              newEntry = {
                startTime: new Date(),
                chainedTo: pendingKey,
                /**
                  * chain off already pending readState
                  * @type {Promise}
                  */
                pending
              }
            }

            return Resolved(newEntry)
          })
      })
      .chain((newEntry) => {
        /**
         * There's no readState needed to be performed,
         * chained or otherwise, either because an exact match
         * was found, or a existing readState for the same message
         * exists.
         *
         * So bail out early
         *
         * TODO: could probably make cleaner upstream
         */
        if (newEntry.exact || newEntry.output) return Resolved(newEntry)

        /**
         * Add the entry to the pending readStates
         */
        pendingReadState.set(key, {
          startTime: newEntry.startTime,
          chainedTo: newEntry.chainedTo,
          pending: newEntry.pending
            /**
              * Unwrapping the async here prevents duplicate work,
              *
              * It is still wrapped in an Async below, but it's the same
              * underlying Promise, so no duplicate work
             */
            .then(() => next.toPromise())
            .finally(removePendingReadState(key))
        })

        /**
         * Return an Async wrapping the actual promise, so minimal
         * duplicate work is performed
         */
        return of(key).chain(fromPromise((key) => pendingReadState.get(key).pending))
      })
  }
}
