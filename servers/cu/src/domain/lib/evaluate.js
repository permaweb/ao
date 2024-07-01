import { Transform, compose as composeStreams, finished } from 'node:stream'

import { always, applySpec, evolve, mergeLeft, mergeRight, pathOr, pipe } from 'ramda'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { LRUCache } from 'lru-cache'

import { evaluatorSchema, findMessageBeforeSchema, saveLatestProcessMemorySchema } from '../dal.js'
import { evaluationSchema } from '../model.js'
import { removeTagsByNameMaybeValue } from '../utils.js'

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
    moduleOptions: ctx.moduleOptions
  }).map((evaluator) => ({ evaluator, ...ctx }))
}

function doesMessageExistWith ({ findMessageBefore }) {
  findMessageBefore = fromPromise(findMessageBeforeSchema.implement(findMessageBefore))

  return (args) => {
    return findMessageBefore(args)
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

  const doesMessageExist = doesMessageExistWith(env)
  const loadEvaluator = evaluatorWith(env)

  const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(env.saveLatestProcessMemory)

  return (ctx) =>
    of(ctx)
      .chain(loadEvaluator)
      .chain(fromPromise(async (ctx) => {
        // A running tally of gas used in the eval stream
        let totalGasUsed = BigInt(0)
        let prev = applySpec({
          /**
           * Ensure all result fields are initialized
           * to their identity
           */
          Memory: pathOr(null, ['result', 'Memory']),
          Error: pathOr(undefined, ['result', 'Error']),
          Messages: pathOr([], ['result', 'Messages']),
          Assignments: pathOr([], ['result', 'Assignments']),
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
              Transform.from(async function * removeInvalidTags ($messages) {
                for await (const message of $messages) {
                  yield evolve(
                    {
                      message: {
                        Tags: pipe(
                          removeTagsByNameMaybeValue('From'),
                          removeTagsByNameMaybeValue('Owner')
                        )
                      }
                    },
                    message
                  )
                }
              }),
              async function (messages) {
                /**
                 * There seems to be duplicate Cron Message evaluations occurring and it's been difficult
                 * to pin down why. My hunch is that the very first message can be a duplicate of the 'from', if 'from'
                 * is itself a Cron Message.
                 *
                 * So to get around this, we maintain a set of strings that unique identify
                 * Cron messages (timestamp+cron interval). We will add each cron message identifier.
                 * If an iteration comes across an identifier already present in this list, then we consider it
                 * a duplicate and remove it from the eval stream.
                 *
                 * This should prevent duplicate Cron Messages from being duplicate evaluated, thus not "tainting"
                 * Memory that is folded as part of the eval stream.
                 *
                 * Since this will only happen at the end and beginning of boundaries generated in loadMessages
                 * this cache can be small, which prevents bloating memory on long cron runs
                 */
                const evaledCrons = new LRUCache({ maxSize: 100, sizeCalculation: always(1) })
                /**
                 * If the starting point ('from') is itself a Cron Message,
                 * then that will be our first identifier added to the set
                 */
                if (ctx.fromCron) evaledCrons.set(toEvaledCron({ timestamp: ctx.from, cron: ctx.fromCron }), true)

                /**
                 * Iterate over the async iterable of messages,
                 * and evaluate each one
                 */
                let first = true
                for await (const { noSave, cron, ordinate, name, message, deepHash, isAssignment, AoGlobal } of messages) {
                  if (cron) {
                    const key = toEvaledCron({ timestamp: message.Timestamp, cron })
                    if (evaledCrons.has(key)) continue
                    /**
                     * We add the crons identifier to the cache,
                     * thus preventing a duplicate evaluation if we come across it
                     * again in the eval stream
                     */
                    else evaledCrons.set(key, true)
                  }

                  /**
                   * We make sure to remove duplicate pushed (matching deepHash)
                   * and duplicate assignments (matching messageId) from the eval stream
                   *
                   * Which prevents them from corrupting the process.
                   *
                   * NOTE: We should only need to check if the message is an assignment
                   * or a pushed message, since the SU rejects any messages with the same id,
                   * that are not an assignment
                   *
                   * TODO: should the CU check every message, ergo not trusting the SU?
                   */
                  if (
                    (deepHash || isAssignment) &&
                    await doesMessageExist({
                      messageId: message.Id,
                      deepHash,
                      isAssignment,
                      processId: ctx.id,
                      epoch: message.Epoch,
                      nonce: message.Nonce
                    }).toPromise()
                  ) {
                    const log = deepHash ? 'deepHash of' : 'assigned id'
                    logger(
                      `Prior Message to process "%s" with ${log} "%s" was found and therefore has already been evaluated. Removing "%s" from eval stream`,
                      ctx.id,
                      deepHash || message.Id,
                      name
                    )
                    continue
                  }

                  prev = await Promise.resolve(prev)
                    .then((prev) =>
                      Promise.resolve(prev.Memory)
                        /**
                         * Where the actual evaluation is performed
                         */
                        .then((Memory) => ctx.evaluator({ first, noSave, name, deepHash, cron, ordinate, isAssignment, processId: ctx.id, Memory, message, AoGlobal }))
                        /**
                         * These values are folded,
                         * so that we can potentially update the process memory cache
                         * at the end of evaluation
                         */
                        .then(mergeLeft({ noSave, message, cron, ordinate }))
                        .then(async (output) => {
                          /**
                           * Make sure to set first to false
                           * for all subsequent evaluations for this evaluation stream
                           */
                          if (first) first = false
                          if (output.GasUsed) totalGasUsed += BigInt(output.GasUsed ?? 0)

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

                          return output
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
            messageId: message.Id,
            timestamp: message.Timestamp,
            nonce: message.Nonce,
            epoch: message.Epoch,
            blockHeight: message['Block-Height'],
            ordinate,
            cron,
            Memory: prev.Memory,
            evalCount: ctx.stats.messages.scheduled + ctx.stats.messages.cron,
            gasUsed: totalGasUsed
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
