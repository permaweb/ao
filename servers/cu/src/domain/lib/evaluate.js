import {
  T, always, applySpec, assocPath, cond, defaultTo, identity,
  ifElse,
  is, mergeRight, pathOr, pipe, propOr, reduced
} from 'ramda'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import AoLoader from '@permaweb/ao-loader'
import { z } from 'zod'

import { findMessageHashSchema, saveEvaluationSchema } from '../dal.js'

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

  return (evaluation) =>
    of(evaluation)
      .chain(saveEvaluation)
      .bimap(
        logger.tap('Failed to save evaluation'),
        (res) => {
          logger('Saved Evaluation %s', evaluation.messageId || `Cron Message ${evaluation.cron}`)
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

  /**
   * When an error occurs, we short circuit the reduce using
   * ramda's 'reduced()' function, but since our accumulator is a Promise,
   * ramda's 'reduce' cannot natively short circuit the reduction.
   *
   * So we do it ourselves by unwrapping the output, and if the value
   * is the 'reduced()' shape, then we immediatley reject, short circuiting the reduction
   *
   * See https://ramdajs.com/docs/#reduced
   * check copied from ramda's internal reduced check impl:
   * https://github.com/ramda/ramda/blob/afe98b03c322fc4d22742869799c9f2796c79744/source/internal/_xReduce.js#L10C11-L10C11
   */
  const maybeReducedError = (With) => (output) => {
    if (output && output['@@transducer/reduced']) {
      return With(output['@@transducer/value'])
    }
    return Promise.resolve(output)
  }
  const maybeResolveError = maybeReducedError(Promise.resolve.bind(Promise))
  const maybeRejectError = maybeReducedError(Promise.reject.bind(Promise))

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
        let prev = applySpec({
          /**
           * Ensure all result fields are initialized
           * to their identity
           */
          Memory: pathOr(null, ['Memory']),
          Error: pathOr(undefined, ['result', 'Error']),
          Messages: pathOr([], ['result', 'Messages']),
          Spawns: pathOr([], ['result', 'Spawns']),
          Output: pathOr('', ['result', 'Output'])
        })(ctx)

        /**
         * Iterate over the async iterable of messages,
         * and evaluate each one
         */
        for await (const { cron, ordinate, message, deepHash, AoGlobal } of ctx.messages) {
          /**
           * We skip over forwarded messages (which we've calculated a deepHash for - see hydrateMessages)
           * if their deepHash is found in the cache, this prevents duplicate evals
           */
          if (deepHash) {
            logger('Checking if "%s" has already been evaluated...', message.Id || `Cron Message ${cron}`)
            const found = await doesMessageHashExist(deepHash).toPromise()
            if (found) {
              logger('Message with deepHash "%s" was found in cache and therefore has already been evaluated. Removing from eval stream', deepHash)
              continue
            }
          }

          prev = await Promise.resolve(prev)
            .then(maybeRejectError)
            .then(prev =>
              Promise.resolve(prev.Memory)
                .then(Memory => {
                  logger('Evaluating message "%s" to process "%s"', message.Id || `Cron Message ${cron}`, ctx.id)
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
                .then((output) => {
                  return output.Error
                    ? Promise.reject(output)
                    : Promise.resolve(output)
                })
                .then(output => {
                  logger('Applied message "%s" to process "%s"', message.Id || `Cron Message ${cron}`, ctx.id)
                  return output
                })
              /**
               * Create a new evaluation to be cached in the local db
               */
                .then((output) =>
                  saveEvaluation({
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
                )
                .catch(logger.tap(
                  'Error occurred when applying message with id "%s" to process "%s" %o',
                  message.Id || `Cron Message ${cron}`,
                  ctx.id
                ))
            )
            /**
             * An error was encountered, so stop reduce and return the output
             */
            .catch(err => Promise.resolve(reduced(err)))
        }

        return prev
      }))
      /**
       * If an error occurred, then it will be wrapped in a reduced,
       * so unwrap it and Resolve, so it can be assigned as output
       * of the evaluation.
       *
       * In other words, this chain should always Resolve
       */
      .chain(fromPromise(maybeResolveError))
      .map(output => ({ output }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
}
