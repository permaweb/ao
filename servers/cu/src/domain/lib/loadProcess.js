import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { identity, mergeRight, pick } from 'ramda'
import { z } from 'zod'

import { findEvaluationSchema, findLatestProcessMemorySchema, saveLatestProcessMemorySchema } from '../dal.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  isColdStart: z.boolean(),
  /**
   * The ordinate of the scheduled message we are
   * evaluating up to.
   */
  toOrdinate: z.coerce.number().nullish(),
  /**
   * The most recent result. This could be the most recent
   * cached result, or potentially initial cold start state
   * if no evaluations are cached
   */
  result: z.record(z.any()),
  /**
   * The timestamp for the most recent message evaluated,
   * or undefined, no cached evaluation exists
   *
   * This will be used to subsequently determine which messaged
   * need to be fetched from the SU in order to perform the evaluation
   */
  from: z.coerce.number().nullish(),
  /**
   * The ordinate from the most recent evaluation
   * or undefined, no cached evaluation exists
   */
  ordinate: z.coerce.string().nullish(),
  /**
   * The most recent message block height. This could be from the most recent
   * cached evaluation, or undefined, if no evaluations were cached
   *
   * This will be used to subsequently determine the range of block metadata
   * to fetch from the gateway
   */
  fromBlockHeight: z.coerce.number().nullish(),
  /**
   * The most recent message cron. This could be from the recent cached Cron Message
   * evaluation, or undefined, if no evaluations were cached, or the latest evaluation
   * was not the result of a Cron message
   */
  fromCron: z.string().nullish(),
  /**
   * The most RECENT SCHEDULED message assignmentId, needed
   * in order to perform hashChain validation
   */
  mostRecentAssignmentId: z.string().nullish(),
  /**
   * The most RECENT SCHEDULED message hashChain, needed
   * in order to perform hashChain validation
   */
  mostRecentHashChain: z.string().nullish(),
  /**
   * Whether the evaluation found is the exact evaluation being requested
   */
  exact: z.boolean().default(false)
}).passthrough()

function loadLatestEvaluationWith ({ findEvaluation, findLatestProcessMemory, saveLatestProcessMemory, logger }) {
  findEvaluation = fromPromise(findEvaluationSchema.implement(findEvaluation))
  findLatestProcessMemory = fromPromise(findLatestProcessMemorySchema.implement(findLatestProcessMemory))
  saveLatestProcessMemory = fromPromise(saveLatestProcessMemorySchema.implement(saveLatestProcessMemory))

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
          toOrdinate: ctx.ordinate,
          result: evaluation.output,
          from: evaluation.timestamp,
          ordinate: evaluation.ordinate,
          fromBlockHeight: evaluation.blockHeight,
          fromCron: evaluation.cron,
          exact: true,
          isColdStart: false
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
      omitMemory: false
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
      .chain((found) => {
        const exact = found.timestamp === ctx.to &&
          found.ordinate === ctx.ordinate &&
          found.cron === ctx.cron

        const isColdStart = ['cold_start'].includes(found.src)

        return of()
          .chain(() => {
            /**
             * Nothing to backfill in-memory cache with,
             * so simply noop
             */
            if (isColdStart) return Resolved(found)
            if (['memory'].includes(found.src) && !found.fromFile) return Resolved(found)

            /**
             * Immediatley attempt to save the memory loaded, from a less-hot checkpoint
             * layer, into the LRU In-memory cache.
             *
             * This will help mitigate concurrent evals of the same process
             * from all making calls to a remote ie. Arweave
             */
            return saveLatestProcessMemory({
              processId: ctx.id,
              evalCount: 0,
              /**
               * map found
               */
              Memory: found.Memory,
              moduleId: found.moduleId,
              assignmentId: found.assignmentId,
              hashChain: found.hashChain,
              // messageId: found.messageId,
              timestamp: found.timestamp,
              epoch: found.epoch,
              nonce: found.nonce,
              ordinate: found.ordinate,
              blockHeight: found.blockHeight,
              cron: found.cron
            })
              .bichain(Resolved, Resolved)
              .map(() => found)
          })
          .map(() => ({
            toOrdinate: ctx.ordinate,
            result: {
              Memory: found.Memory
            },
            from: found.timestamp,
            ordinate: found.ordinate,
            fromBlockHeight: found.blockHeight,
            fromCron: found.cron,
            mostRecentAssignmentId: found.assignmentId,
            mostRecentHashChain: found.hashChain,
            /**
             * The exact evaluation may not have been found in persitence,
             * but it may be found in a caching tier.
             *
             * So we still signal to the caller whether an exact match
             * was found, for potential optimizations.
             */
            exact,
            isColdStart
          }))
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
export function loadProcessWith (env) {
  const logger = env.logger.child('loadProcess')
  env = { ...env, logger }

  const loadLatestEvaluation = loadLatestEvaluationWith(env)

  return (ctx) => {
    return of(ctx)
      .chain(loadLatestEvaluation)
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
