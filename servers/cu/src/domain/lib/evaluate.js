import {
  T, always, applySpec, assocPath, cond, identity,
  ifElse,
  is, mergeRight, pathOr, pipe, propOr, reduce, reduced
} from 'ramda'
import { Resolved, fromPromise, of } from 'hyper-async'
import AoLoader from '@permaweb/ao-loader'
import { z } from 'zod'

import { saveEvaluationSchema } from '../dal.js'

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
  return of(ctx.src)
    .map(AoLoader)
    .map((handle) => ({ handle, ...ctx }))
}

function saveEvaluationWith ({ saveEvaluation, logger }) {
  saveEvaluation = fromPromise(saveEvaluationSchema.implement(saveEvaluation))

  return (evaluation) =>
    of(evaluation)
      .map(logger.tap('Caching evaluation %O'))
      .chain(saveEvaluation)
      /**
       * Always ensure this Async resolves
       */
      .bichain(Resolved, Resolved)
      .map(() => evaluation)
}

/**
   * @typedef EvaluateArgs
   * @property {string} id - the contract id
   * @property {Record<string, any>} state - the initial state
   * @property {string} from - the initial state sortKey
   * @property {ArrayBuffer} src - the contract wasm as an array buffer
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

  const saveEvaluation = saveEvaluationWith({ ...env, logger })

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
  const mergeOutput = (prev) => applySpec({
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
    state: ifElse(
      pathOr(undefined, ['result', 'error']),
      always(prev.state),
      propOr(prev.state, 'state')
    ),
    result: {
      error: pathOr(undefined, ['result', 'error']),
      messages: pathOr([], ['result', 'messages']),
      spawns: pathOr([], ['result', 'spawns']),
      output: pipe(
        pathOr('', ['result', 'output']),
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
    }
  })

  return (ctx) =>
    of(ctx)
      .chain(addHandler)
      .map(ctx => {
        if (!ctx.messages.length) {
          logger('No Messages to evaluate. Returning latest evaled state')
        } else {
          logger(
            'Evaluating %s messages for process %s from "%s" to "%s',
            ctx.messages.length,
            ctx.id,
            ctx.from || 'initial',
            ctx.to || 'latest'
          )
        }

        return ctx
      })
      /**
       * I'd prefer to use Async here, but it is possible to exceed the maximum callstack
       * when evaluating large numbers of messages because of all of .chain()'d calls on the Async
       *
       * So for the fold here, we use vanilla promises, so the fold exists only within a single chain()
       * in the Async pipeline. It is functionally equivalent, but then/catch on Promises isn't as expressive
       * as a Bimonad
       */
      .chain(fromPromise((ctx) =>
        reduce(
          async (outputAsync, { message, sortKey, AoGlobal }) =>
            outputAsync
              .then(maybeRejectError)
              .then((prev) =>
                Promise.resolve(prev.state)
                  .then((state) => ctx.handle(state, message, AoGlobal))

                  /**
                   * Map thrown error to a result.error
                   */
                  .catch((err) => Promise.resolve(assocPath(['result', 'error'], err, {})))
                  /**
                   * The the previous interaction output, and merge it
                   * with the output of the current interaction
                   */
                  .then(mergeOutput(prev))
                  .then((output) => {
                    return output.result && output.result.error
                      ? Promise.reject(output)
                      : Promise.resolve(output)
                  })
                  .then(
                    logger.tap(
                      'Applied message with sortKey "%s" to process "%s"',
                      sortKey,
                      ctx.id
                    )
                  )
                  /**
                   * Create a new evaluation to be cached in the local db
                   */
                  .then((output) =>
                    saveEvaluation({
                      sortKey,
                      processId: ctx.id,
                      message,
                      output,
                      evaluatedAt: new Date()
                    })
                      .map(() => output)
                      .toPromise()
                  )
                  .catch(logger.tap(
                    'Error occurred when applying message with sortKey "%s" to process "%s"',
                    sortKey,
                    ctx.id
                  ))
              )
              /**
               * An error was encountered, so stop reduce and return the output
               */
              .catch(err => Promise.resolve(reduced(err))),
          Promise.resolve({
            state: ctx.state,
            /**
                 * Ensure all result fields are initialized
                 * to their identity
                 */
            result: applySpec({
              messages: pathOr([], ['messages']),
              output: pathOr('', ['output']),
              spawns: pathOr([], ['spawns'])
            })(ctx.result)
          }),
          ctx.messages
        )
      ))
      /**
       * If an error occurred, then it will be wrapped in a reduced,
       * so unwrap it and Resolve, so it can be assigned as output
       * of the evaluation.
       *
       * In other words, this chain should always Resolve
       */
      .chain(fromPromise(maybeResolveError))
      .map(output => ({ output }))
      .map(logger.tap('Appended eval output to ctx'))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
}
