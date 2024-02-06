import {
  T, always, applySpec, assocPath, cond, defaultTo, identity,
  ifElse, is, mergeRight, pathOr, pipe, propOr
} from 'ramda'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import AoLoader from '@permaweb/ao-loader'
import { z } from 'zod'

import { doesExceedMaximumHeapSizeSchema, findMessageHashSchema, saveEvaluationSchema } from '../dal.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  output: z.record(z.any())
}).passthrough()

const toEvaledCron = ({ timestamp, cron }) => `${timestamp}-${cron}`

/**
 * @typedef Env
 * @property {any} db
 */

function addHandler (ctx) {
  return of(ctx.module)
    .chain(fromPromise(AoLoader))
    .map((handle) => ({ handle, ...ctx }))
}

function saveEvaluationWith ({ saveEvaluation, logger }) {
  saveEvaluation = fromPromise(saveEvaluationSchema.implement(saveEvaluation))

  return ({ name, ...evaluation }) =>
    of(evaluation)
      .chain(saveEvaluation)
      .bimap(
        logger.tap('Failed to save evaluation'),
        (res) => {
          logger('Saved Evaluation "%s"', name)
          return res
        }
      )
      /**
       * Always ensure this Async resolves
       */
      .bichain(Resolved, Resolved)
      .map(() => evaluation)
}

function doesMessageHashExistWith ({ findMessageHash }) {
  findMessageHash = fromPromise(findMessageHashSchema.implement(findMessageHash))

  return (deepHash) => {
    return findMessageHash({ messageHash: deepHash })
      .bichain(
        err => {
          if (err.status === 404) return Resolved(false)
          return Rejected(err)
        },
        () => Resolved(true)
      )
  }
}

function doesHeapExceedMaxSizeWith ({ doesExceedMaximumHeapSize }) {
  doesExceedMaximumHeapSize = fromPromise(doesExceedMaximumHeapSizeSchema.implement(doesExceedMaximumHeapSize))

  return (heap) => doesExceedMaximumHeapSize({ heap })
}

/**
 * @typedef EvaluateArgs
 * @property {string} id - the contract id
 * @property {Record<string, any>} state - the initial state
 * @property {string} from - the initial state timestamp
 * @property {ArrayBuffer} module - the contract wasm as an array buffer
 * @property {Record<string, any>[]} action - an array of interactions to apply
 *
 * @callback Evaluate
 * @param {EvaluateArgs} args
 * @returns {Async<z.infer<typeof ctxSchema>}
 *
 * @param {Env} env
 * @returns {Evaluate}
 */
export function evaluateWith (env) {
  const logger = env.logger.child('evaluate')
  env = { ...env, logger }

  const doesMessageHashExist = doesMessageHashExistWith(env)
  const saveEvaluation = saveEvaluationWith(env)
  const doesHeapExceedMaxSize = doesHeapExceedMaxSizeWith(env)

  /**
   * Given the previous interaction output,
   * return a function that will merge the next interaction output
   * with the previous.
   */
  const mergeOutput = (prev) => pipe(
    defaultTo({}),
    applySpec({
      /**
       * We default to 'new' state, from applying an interaction,
       * to the previous state, but it will be overwritten by the outputs state
       *
       * This ensures the new interaction in the chain has state to
       * operate on, even if the previous interaction only produced
       * messages and no state change.
       *
       * If the output contains an error, ignore its state,
       * and use the previous message's state
       */
      Memory: ifElse(
        pathOr(undefined, ['Error']),
        always(prev.Memory),
        propOr(prev.Memory, 'Memory')
      ),
      Error: pathOr(undefined, ['Error']),
      Messages: pathOr([], ['Messages']),
      Spawns: pathOr([], ['Spawns']),
      Output: pipe(
        pathOr('', ['Output']),
        /**
         * Always make sure the output
         * is a string or object
         */
        cond([
          [is(String), identity],
          [is(Object), identity],
          [is(Number), String],
          [T, identity]
        ])
      )
    })
  )

  return (ctx) =>
    of(ctx)
      .chain(addHandler)
      .chain(fromPromise(async (ctx) => {
        /**
         * There seems to be duplicate Cron Message evaluations occurring and it's been difficult
         * to pin down why. My hunch is that the very first message can be a duplicate of the 'from', if 'from'
         * is itself a Cron Message.
         *
         * So to get around this, we maintain a set of strings that unique identify
         * Cron messages (timestamp+cron interval). We will add each cron message identifier to this Set.
         * If an iteration comes across an identifier already present in this list, then we consider it
         * a duplicate and remove it from the eval stream.
         *
         * This should prevent duplicate Cron Messages from being duplicate evaluated, thus not "tainting"
         * Memory that is folded as part of the eval stream
         */
        const evaledCrons = new Set()
        /**
          * If the starting point ('from') is itself a Cron Message,
          * then that will be our first identifier added to the set
          */
        if (ctx.fromCron) evaledCrons.add(toEvaledCron({ timestamp: ctx.from, cron: ctx.fromCron }))

        let prev = applySpec({
          /**
           * Ensure all result fields are initialized
           * to their identity
           */
          Memory: pathOr(null, ['result', 'Memory']),
          Error: pathOr(undefined, ['result', 'Error']),
          Messages: pathOr([], ['result', 'Messages']),
          Spawns: pathOr([], ['result', 'Spawns']),
          Output: pathOr('', ['result', 'Output'])
        })(ctx)
        /**
         * Iterate over the async iterable of messages,
         * and evaluate each one
         */
        for await (const { noSave, cron, ordinate, name, message, deepHash, AoGlobal } of ctx.messages) {
          if (cron) {
            const key = toEvaledCron({ timestamp: message.Timestamp, cron })
            if (evaledCrons.has(key)) continue
            /**
             * We add the crons identifier to the Set,
             * thus preventing a duplicate evaluation if we come across it
             * again in the eval stream
             */
            else evaledCrons.add(key)
          }

          /**
           * We skip over forwarded messages (which we've calculated a deepHash for - see hydrateMessages)
           * if their deepHash is found in the cache, this prevents duplicate evals
           */
          if (deepHash) {
            logger('Checking if "%s" has already been evaluated...', name)
            const found = await doesMessageHashExist(deepHash).toPromise()
            if (found) {
              logger('Message "%s" with deepHash "%s" was found in cache and therefore has already been evaluated. Removing from eval stream', name, deepHash)
              continue
            }
          }

          prev = await Promise.resolve(prev)
            .then((prev) =>
              Promise.resolve(prev.Memory)
                .then(Memory => {
                  logger('Evaluating message "%s" to process "%s"', name, ctx.id)
                  return Memory
                })
                /**
                 * Where the actual evaluation is performed
                 */
                .then((Memory) => ctx.handle(Memory, message, AoGlobal))
                /**
                 * Map thrown error to a result.error
                 */
                .catch((err) => Promise.resolve(assocPath(['Error'], err, {})))
                /**
                 * The the previous interaction output, and merge it
                 * with the output of the current interaction
                 */
                .then(mergeOutput(prev))
                .then(async (output) => {
                  if (cron) ctx.stats.messages.cron++
                  else ctx.stats.messages.scheduled++

                  /**
                   * TODO: maybe a better spot to place this check, so it's not so disjointed.
                   *
                   * For now this get's us what we need. Rejecting here will cause the eval to not
                   * be persisted, and then overall evaluation to stop
                   */
                  if (await doesHeapExceedMaxSize(output.Memory).toPromise()) {
                    logger('FATAL: message "%s" caused process "%s" evaluated heap to exceed maximum allowed size. Short-circuiting evaluation...', name, ctx.id)
                    // eslint-disable-next-line
                    return Promise.reject({ status: 413, message: 'ao Process WASM exceeded maximum heap size' })
                  }

                  return Promise.resolve(output)
                    .then((output) => {
                      return output.Error
                        ? Promise.reject(output)
                        : Promise.resolve(output)
                    })
                    .then(output => {
                      logger('Applied message "%s" to process "%s"', name, ctx.id)
                      return output
                    })
                    /**
                     * Create a new evaluation to be cached in the local db
                     */
                    .then((output) => {
                      /**
                       * Noop saving the evaluation is noSave flag is set
                       */
                      if (noSave) return output

                      return saveEvaluation({
                        name,
                        deepHash,
                        cron,
                        ordinate,
                        processId: ctx.id,
                        messageId: message.Id,
                        timestamp: message.Timestamp,
                        blockHeight: message['Block-Height'],
                        evaluatedAt: new Date(),
                        output
                      })
                        .map(() => output)
                        .toPromise()
                    })
                    .catch((err) => {
                      logger(
                        'Error occurred when applying message "%s" to process "%s": "%s',
                        name,
                        ctx.id,
                        err.Error
                      )
                      ctx.stats.messages.error++

                      return err
                    })
                })
            )
        }

        return prev
      }))
      .map(output => ({ output }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
}
