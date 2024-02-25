import { compose as composeStreams, finished } from 'node:stream'

import { always, applySpec, identity, mergeLeft, mergeRight, pathOr } from 'ramda'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { z } from 'zod'

import { evaluatorSchema, findMessageHashBeforeSchema, saveEvaluationSchema } from '../dal.js'
import { evaluationSchema } from '../model.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  output: evaluationSchema.shape.output,
  /**
   * The last message evaluated, or null if a message was not evaluated
   */
  last: z.object({
    timestamp: z.coerce.number(),
    blockHeight: z.coerce.number(),
    ordinate: z.coerce.string()
  })
}).passthrough()

const toEvaledCron = ({ timestamp, cron }) => `${timestamp}-${cron}`

/**
 * @typedef Env
 * @property {any} db
 */

function evaluatorWith ({ loadEvaluator }) {
  loadEvaluator = fromPromise(evaluatorSchema.implement(loadEvaluator))

  return (ctx) => loadEvaluator({
    moduleId: ctx.moduleId,
    gas: ctx.moduleComputeLimit,
    memLimit: ctx.moduleMemoryLimit
  }).map((evaluator) => ({ evaluator, ...ctx }))
}

function saveEvaluationWith ({ saveEvaluation, logger }) {
  saveEvaluation = fromPromise(saveEvaluationSchema.implement(saveEvaluation))

  return ({ name, ...evaluation }) =>
    of(evaluation)
      .chain(saveEvaluation)
      .bimap(
        logger.tap('Failed to save evaluation'),
        identity
      )
      /**
       * Always ensure this Async resolves
       */
      .bichain(Resolved, Resolved)
      .map(() => evaluation)
}

function doesMessageHashExistWith ({ findMessageHashBefore }) {
  findMessageHashBefore = fromPromise(findMessageHashBeforeSchema.implement(findMessageHashBefore))

  return ({ deepHash, processId, timestamp, ordinate }) => {
    return findMessageHashBefore({ messageHash: deepHash, processId, timestamp, ordinate })
      .bichain(
        (err) => {
          if (err.status === 404) return Resolved(false)
          return Rejected(err)
        },
        () => Resolved(true)
      )
  }
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
  const loadEvaluator = evaluatorWith(env)

  const saveLatestProcessMemory = env.saveLatestProcessMemory

  return (ctx) =>
    of(ctx)
      .chain(loadEvaluator)
      .chain(fromPromise(async (ctx) => {
        let prev = applySpec({
          /**
           * Ensure all result fields are initialized
           * to their identity
           */
          Memory: pathOr(null, ['result', 'Memory']),
          Error: pathOr(undefined, ['result', 'Error']),
          Messages: pathOr([], ['result', 'Messages']),
          Spawns: pathOr([], ['result', 'Spawns']),
          Output: pathOr('', ['result', 'Output']),
          GasUsed: pathOr(undefined, ['result', 'GasUsed']),
          noSave: always(true)
        })(ctx)

        await new Promise((resolve, reject) => {
          const cleanup = finished(
            /**
             * Where the entire eval stream is composed and concludes.
             *
             * messages will flow into evaluation, respecting backpressure, bubbling errors,
             * and cleaning up resources when finished.
             */
            composeStreams(
              ctx.messages,
              async function (messages) {
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

                /**
                 * Keep track of any deepHashes in the eval stream
                 * as a quick way to eliminate dupes in the same eval stream
                 */
                const deepHashes = new Set()

                /**
                 * Iterate over the async iterable of messages,
                 * and evaluate each one
                 */
                for await (const { noSave, cron, ordinate, name, message, deepHash, AoGlobal } of messages) {
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
                   * if their deepHash is found in the cache.
                   *
                   * This prevents duplicate evals from double cranks
                   */
                  if (deepHash) {
                    if (deepHashes.has(deepHash) ||
                        await doesMessageHashExist({
                          deepHash,
                          processId: ctx.id,
                          timestamp: message.Timestamp,
                          ordinate
                        }).toPromise()
                    ) {
                      logger(
                        'Prior Message to process "%s" with deepHash "%s" was found and therefore has already been evaluated. Removing "%s" from eval stream',
                        ctx.id,
                        deepHash,
                        name
                      )
                      continue
                    } else deepHashes.add(deepHash)
                  }

                  prev = await Promise.resolve(prev)
                    .then((prev) =>
                      Promise.resolve(prev.Memory)
                        /**
                         * Where the actual evaluation is performed
                         */
                        .then((Memory) => ctx.evaluator({ name, processId: ctx.id, Memory, message, AoGlobal }))
                        /**
                         * These values are folded,
                         * so that we can potentially update the process memory cache
                         * at the end of evaluation
                         */
                        .then(mergeLeft({ noSave, message, cron, ordinate }))
                        .then(async (output) => {
                          if (cron) ctx.stats.messages.cron++
                          else ctx.stats.messages.scheduled++

                          if (output.Error) {
                            logger(
                              'Error occurred when applying message "%s" to process "%s": "%s',
                              name,
                              ctx.id,
                              output.Error
                            )
                            ctx.stats.messages.error = ctx.stats.messages.error || 0
                            ctx.stats.messages.error++
                          }

                          return Promise.resolve(output)
                            .then((output) => {
                              /**
                               * Noop saving the evaluation is noSave flag is set
                               */
                              if (noSave) return output

                              /**
                               * Create a new evaluation to be cached in the local db
                               */
                              return saveEvaluation({
                                name,
                                deepHash,
                                cron,
                                ordinate,
                                processId: ctx.id,
                                messageId: message.Id,
                                timestamp: message.Timestamp,
                                nonce: message.Nonce,
                                epoch: message.Epoch,
                                blockHeight: message['Block-Height'],
                                evaluatedAt: new Date(),
                                output
                              })
                                .toPromise()
                                .catch((err) => {
                                  logger(
                                    'Unexpected Error occurred when saving evaluation of "%s" to process "%s"',
                                    name,
                                    ctx.id,
                                    err
                                  )
                                })
                                .then(() => output)
                            })
                        })
                    )
                }
              }
            ),
            (err) => {
              /**
               * finshed() will leave dangling event listeners even after this callback
               * has been invoked, so that unexpected errors do not cause full-on crashes.
               *
               * finished() returns a callback fn to cleanup these dangling listeners, so we make sure
               * to always call it here to prevent memory leaks.
               *
               * See https://nodejs.org/api/stream.html#streamfinishedstream-options-callback
               */
              cleanup()
              err ? reject(err) : resolve()
            }
          )
        })

        /**
         * Make sure to attempt to cache the last result
         * in the process memory cache
         *
         * TODO: could probably make this cleaner
         */
        const { noSave, cron, ordinate, message } = prev
        if (!noSave) {
          await saveLatestProcessMemory({
            processId: ctx.id,
            moduleId: ctx.moduleId,
            timestamp: message.Timestamp,
            nonce: message.Nonce,
            epoch: message.Epoch,
            blockHeight: message['Block-Height'],
            ordinate,
            cron,
            Memory: prev.Memory
          })
        }

        return {
          output: prev,
          last: {
            timestamp: pathOr(ctx.from, ['message', 'Timestamp'], prev),
            blockHeight: pathOr(ctx.fromBlockHeight, ['message', 'Block-Height'], prev),
            ordinate: pathOr(ctx.ordinate, ['ordinate'], prev)
          }
        }
      }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
}
