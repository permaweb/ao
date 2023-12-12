import {
  T, always, applySpec, assocPath, cond, defaultTo, identity,
  ifElse,
  is, mergeRight, pathOr, pipe, propOr, reduced
} from 'ramda'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import AoLoader from '@permaweb/ao-loader'
import { z } from 'zod'

import { findMessageIdSchema, saveEvaluationSchema } from '../dal.js'

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

function saveEvaluationWith ({ saveEvaluation }) {
  saveEvaluation = fromPromise(saveEvaluationSchema.implement(saveEvaluation))

  return (evaluation) =>
    of(evaluation)
      .chain(saveEvaluation)
      /**
       * Always ensure this Async resolves
       */
      .bichain(Resolved, Resolved)
      .map(() => evaluation)
}

function doesMessageIdExistWith ({ findMessageId }) {
  findMessageId = fromPromise(findMessageIdSchema.implement(findMessageId))

  return (deepHash) => {
    return findMessageId({ messageId: deepHash })
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
 * @property {string} from - the initial state sortKey
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

  const doesMessageIdExist = doesMessageIdExistWith(env)
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
      buffer: ifElse(
        pathOr(undefined, ['error']),
        always(prev.buffer),
        propOr(prev.buffer, 'buffer')
      ),
      error: pathOr(undefined, ['error']),
      messages: pathOr([], ['messages']),
      spawns: pathOr([], ['spawns']),
      output: pipe(
        pathOr('', ['output']),
        /**
           * Always make sure the output
           * is a string
           */
        cond([
          [is(String), identity],
          [is(Number), String],
          [is(Object), obj => JSON.stringify(obj)],
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
          buffer: pathOr(null, ['buffer']),
          error: pathOr(undefined, ['result', 'error']),
          messages: pathOr([], ['result', 'messages']),
          spawns: pathOr([], ['result', 'spawns']),
          output: pathOr([], ['result', 'output'])
        })(ctx)

        /**
         * Iterate over the async iterable of messages,
         * and evaluate each one
         */
        for await (const { message, deepHash, sortKey, AoGlobal } of ctx.messages) {
          /**
           * We skip over forwarded messages (which we've calculated a deepHash for - see hydrateMessages)
           * if their deepHash is found in the cache, this prevents duplicate evals
           */
          if (deepHash) {
            logger('Checking if "%s" has already been evaluated...', sortKey)
            const found = await doesMessageIdExist(deepHash).toPromise()
            if (found) {
              logger('Message with deepHash "%s" was found in cache and therefor has already been evaluated. Removing from eval stream', deepHash)
              continue
            }
          }

          prev = await Promise.resolve(prev)
            .then(maybeRejectError)
            .then(prev =>
              Promise.resolve(prev.buffer)
                .then(buffer => {
                  logger('Evaluating message with sortKey "%s" to process "%s"', sortKey, ctx.id)
                  return buffer
                })
                /**
                 * Where the actual evaluation is performed
                 */
                .then((buffer) => ctx.handle(buffer, message, AoGlobal))
                /**
                 * Map thrown error to a result.error
                 */
                .catch((err) => Promise.resolve(assocPath(['error'], err, {})))
                /**
                 * The the previous interaction output, and merge it
                 * with the output of the current interaction
                 */
                .then(mergeOutput(prev))
                .then((output) => {
                  return output.error
                    ? Promise.reject(output)
                    : Promise.resolve(output)
                })
                .then(output => {
                  logger('Applied message with sortKey "%s" to process "%s"', sortKey, ctx.id)
                  return output
                })
              /**
               * Create a new evaluation to be cached in the local db
               */
                .then((output) =>
                  saveEvaluation({
                    deepHash,
                    sortKey,
                    processId: ctx.id,
                    output,
                    evaluatedAt: new Date()
                  })
                    .map(() => output)
                    .toPromise()
                )
                .catch(logger.tap(
                  'Error occurred when applying message with sortKey "%s" to process "%s" %o',
                  sortKey,
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
