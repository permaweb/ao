import { Transform, compose as composeStreams } from 'node:stream'
import { pipeline } from 'node:stream/promises'

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
  }).passthrough()
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
  const evaluationCounter = env.evaluationCounter
  // const gasCounter = env.gasCounter
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
        let mostRecentAssignmentId = ctx.mostRecentAssignmentId
        let mostRecentHashChain = ctx.mostRecentHashChain
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
          Patches: pathOr([], ['result', 'Patches']),
          GasUsed: pathOr(undefined, ['result', 'GasUsed']),
          noSave: always(true)
        })(ctx)

        const evalStream = async function (messages) {
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
          for await (const { noSave, cron, ordinate, name, message, deepHash, isAssignment, assignmentId, AoGlobal } of messages) {
            if (cron) {
              const key = toEvaledCron({ timestamp: message.Timestamp, cron })
              if (evaledCrons.has(key)) continue
              /**
               * We add the crons identifier to the cache,
               * thus preventing a duplicate evaluation if we come across it
               * again in the eval stream
               */
              else evaledCrons.set(key, true)
            } else if (!noSave) {
              /**
               * As messages stream into the process to be evaluated,
               * we need to keep track of the most assignmentId
               * and hashChain of the most recent scheduled message
               */
              mostRecentAssignmentId = assignmentId
              mostRecentHashChain = message['Hash-Chain']
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

                    /**
                     * Increments gauges for total evaluations for both:
                     *
                     * total evaluations (no labels)
                     * specific kinds of evaluations (type of eval stream, type of message, whether an error occurred or not)
                     */
                    evaluationCounter.inc(1)
                    evaluationCounter.inc(
                      1,
                      {
                        stream_type: ctx.dryRun ? 'dry-run' : 'primary',
                        message_type: ctx.dryRun ? 'dry-run' : cron ? 'cron' : isAssignment ? 'assignment' : 'scheduled',
                        process_error: Boolean(output.Error)
                      },
                      { processId: ctx.id }
                    )
                    /**
                     * TODO: Gas can grow to a huge number. We need to make sure this doesn't crash when that happens
                     */
                    // gasCounter.inc(output.GasUsed ?? 0, { cron: Boolean(cron), dryRun: Boolean(ctx.dryRun) }, { processId: ctx.id, error: Boolean(output.Error) })

                    return output
                  })
              )
          }
        }

        const removeInvalidTags = Transform.from(async function * ($messages) {
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
        })

        /**
         * ABANDON ALL HOPE YE WHO ENTER HERE
         *
         * compose from node:streams has some incredibly hard to debug issues, when it comes to destroying
         * streams and propagating errors, when composing multiple levels of streams.
         *
         * In order to circumvent these issues, we've hacked the steps to instead build a list of
         * streams, then combine them all here.
         *
         * THEN we add an error listener such that any stream erroring
         * results in all streams being cleaned up and destroyed with that error.
         *
         * Finally, if an error was thrown from any stream, we reject a top level promise that
         * then triggers Promise.race to also reject, bubbling the error
         */
        if (!Array.isArray(ctx.messages)) ctx.messages = [ctx.messages]
        const streams = [...ctx.messages, removeInvalidTags]
        streams.push(composeStreams(...streams))
        const { promise: bailout, resolve: pResolve, reject: pReject } = Promise.withResolvers()
        streams.forEach(s => {
          s.on('error', (err) => {
            streams.forEach(s => {
              s.emit('end')
              s.destroy(err)
              setImmediate(() => s.removeAllListeners())
            })

            pReject(err)
          })
        })
        await Promise.race([
          pipeline(streams[streams.length - 1], evalStream).then(pResolve),
          bailout
        ])

        /**
         * Make sure to attempt to cache the last result
         * in the process memory cache
         *
         * Memory being falsey is a special case, in which
         * _all_ messages, from the beginning resulted in an error,
         * so all resultant memory was discarded. In this case,
         * there is no memory to cache, and so nothing to do. Skip.
         *
         * TODO: could probably make this cleaner
         */
        const { noSave, cron, ordinate, message } = prev

        if (!noSave && prev.Memory) {
          await saveLatestProcessMemory({
            processId: ctx.id,
            moduleId: ctx.moduleId,
            messageId: message.Id,
            assignmentId: mostRecentAssignmentId,
            hashChain: mostRecentHashChain,
            timestamp: message.Timestamp,
            nonce: message.Nonce,
            epoch: message.Epoch,
            blockHeight: message['Block-Height'],
            ordinate,
            cron,
            Memory: prev.Memory,
            gasUsed: totalGasUsed
          })
        }

        return {
          output: prev,
          last: {
            /**
             * id could be undefined, since the latest message evaluated
             * could have been a Cron Message, and so will not have an 'id'.
             */
            id: pathOr(undefined, ['message', 'Id'], prev),
            timestamp: pathOr(ctx.from, ['message', 'Timestamp'], prev),
            blockHeight: pathOr(ctx.fromBlockHeight, ['message', 'Block-Height'], prev),
            ordinate: pathOr(ctx.ordinate, ['ordinate'], prev),
            cron: pathOr(ctx.fromCron, ['cron'], prev)
          }
        }
      }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
}
