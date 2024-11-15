import { Rejected, Resolved, fromPromise } from 'hyper-async'
import { identity, pick } from 'ramda'
import AsyncLock from 'async-lock'

import { findEvaluationSchema } from '../dal.js'
import { findPendingForProcessBeforeWith, isLaterThan } from '../utils.js'

const chainLock = new AsyncLock({ maxPending: Number.MAX_SAFE_INTEGER })

function loadLatestEvaluationWith ({ findEvaluation, findLatestProcessMemory, logger }) {
  findEvaluation = fromPromise(findEvaluationSchema.implement(findEvaluation))
  // TODO: wrap in zod schemas to enforce contract
  findLatestProcessMemory = fromPromise(findLatestProcessMemory)

  function maybeExactEvaluation (ctx) {
    /**
     * We also need the Memory for the evaluation,
     * we need to either fetch from cache or perform an evaluation
     */
    if (ctx.needsOnlyMemory) return Rejected(ctx)

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

export function chainEvaluationWith (env) {
  const logger = env.logger.child('chainEvaluation')
  env = { ...env, logger }

  const loadLatestEvaluation = loadLatestEvaluationWith(env)

  const pendingReadState = env.pendingReadState
  const fromPendingKey = env.fromPendingKey
  const findPendingForProcessBefore = findPendingForProcessBeforeWith(pendingReadState)

  /**
   * Check whether any evaluation chaining can be performed,
   * potentially reducing duplicated work.
   *
   * Find an exact match to the evaluation requesting to be performed (a cached eval)
   * or return a cache entry to be chainedTo
   */
  return ({ pendingKey: key, processId, to, ordinate, cron, needsOnlyMemory }) => {
    /**
     * LOCK CRITICAL SECTION:
     *
     * determine what to do with the incoming readState:
     * - chain it to an existing evaluation stream
     * - dedupe it, due to an identicial evaluation stream already executing
     * - start it up as a brand new evaluation stream
     *
     * This check requires acquisition of a lock, to avoid race conditions from multiple
     * incoming readStates asynchronously determining whether or not to chain
     */
    return fromPromise(() => chainLock.acquire(processId, async () => {
      /**
       * There is already an exact instance of the readState already pending,
       * so simply return the entry, and no new work need to be performed
       */
      if (pendingReadState.has(key)) return [false, pendingReadState.get(key)]

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
       * There are cases where many messages, scheduled in close proximity are sent to a CU
       * at one time. These requests can arrive jumbled to the CU resulting in later messages
       * obtaining the lock first, spinning up eval streams.
       *
       * Then when earlier message (whose request
       * just so happend to arrive at the CU milliseconds later) will detect no earlier pending eval stream
       * to chain to, and start up it's own eval stream, thus achieving poor deduplication.
       *
       * To help mitigate this, we add 10 seconds to 'to', to give room for this jumble of messages.
       * So this could potentially chain an earlier message eval to a later message eval, thus delaying it,
       * but only by 10 seconds worth of messages, NOT actually 10 seconds. And in this case, the earlier
       * message should then be in the cache, and so won't spin up another eval stream
       *
       * TODO: perhaps we could rearrange the pendingReadState key to place 'ordinate' in front of 'to'
       * then adjust to comparing 'ordinate' first here -- thus making the buffer message based,
       * and not time based. See ln.65 in readState.js
       */
      const pendingForProcessBefore = findPendingForProcessBefore({ processId, timestamp: to ? to + 10000 : to })
      /**
       * No pending evaluation stream was found, so there is no reason to check the process
       * memory cache for an entry and then to compare it to the pending evalaution stream,
       * in order to determine the optimal chaining strategy.
       *
       * This will result in an evaluation stream being immediately spun up
       * with no chaining
       */
      if (!pendingForProcessBefore) return [true, newEntry]

      return loadLatestEvaluation({ id: processId, to, ordinate, cron, needsOnlyMemory })
        .toPromise()
        .then((res) => {
          /**
           * The exact evaluation (identified by its input messages timestamp)
           * was found in the cache, so just return it.
           *
           * This results in no new evaluation stream being performed, as the work
           * has already been performed and cached.
           *
           * An evaluation stream will ultimately return a { result } containing
           * the message result. so since we've found the output
           * cached, we simply set { result } to the cached
           * evaluation output, to match the shape.
           */
          if (res.exact) return [false, { pending: Promise.resolve({ ...res, output: res.result }) }]

          const [pendingKey, { pending, chainedTo }] = pendingForProcessBefore
          const [, pTo, pOrdinate, pCron] = fromPendingKey(pendingKey)

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
            /**
             * chain off already pending evaluation stream,
             * indicating it's place in the chain by the
             * entry's "chainedTo" field.
             *
             * The result is a set of trees where each pending evaluation stream
             * may have a parent evaluation stream that it is waiting for to complete
             * and potentially many children evaluation streams itself
             */
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

          return [true, newEntry]
        })
    }))()
  }
}
