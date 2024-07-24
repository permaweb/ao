import {
  F, T, __, allPass, always, append, assoc, chain, concat, cond, defaultTo, equals,
  has, ifElse, includes, is, join, map, pipe, propEq, propOr, reduce, reject
} from 'ramda'
import { ZodError, ZodIssueCode } from 'zod'

export const joinUrl = ({ url, path }) => {
  if (!path) return url
  if (path.startsWith('/')) return joinUrl({ url, path: path.slice(1) })

  url = new URL(url)
  url.pathname += path
  return url.toString()
}

/* eslint-disable no-throw-literal */
/**
 * If either ARWEAVE_URL or GRAPHQL_URL is not defined, then set them to their defaults
 * using GATEWAY_URL, which will always have a value.
 */
export const preprocessUrls = (envConfig) => {
  let { GATEWAY_URL, ARWEAVE_URL, GRAPHQL_URL, ...theRestOfTheConfig } = envConfig

  if (ARWEAVE_URL && GRAPHQL_URL) return envConfig

  if (!GATEWAY_URL) {
    if (!ARWEAVE_URL && !GRAPHQL_URL) throw 'GATEWAY_URL is required, if either ARWEAVE_URL or GRAPHQL_URL is not provided'
    if (!ARWEAVE_URL) throw 'GATEWAY_URL is required if ARWEAVE_URL is not provided'
    if (!GRAPHQL_URL) throw 'GATEWAY_URL is required if GRAPHQL_URL is not provided'
  }

  if (!ARWEAVE_URL) ARWEAVE_URL = GATEWAY_URL
  if (!GRAPHQL_URL) GRAPHQL_URL = joinUrl({ url: GATEWAY_URL, path: '/graphql' })

  return { ARWEAVE_URL, GRAPHQL_URL, ...theRestOfTheConfig }
}
/* eslint-enable no-throw-literal */

export function errFrom (err) {
  let e
  /**
   * Imperative to not inflate the stack trace
   */
  if (is(ZodError, err)) {
    e = new Error(mapZodErr(err))
    e.stack += err.stack
  } else if (is(Error, err)) {
    e = err
  } else if (has('message', err)) {
    e = new Error(err.message)
  } else if (is(String, err)) {
    e = new Error(err)
  } else {
    e = new Error('An error occurred')
  }

  return e
}

function mapZodErr (zodErr) {
  return pipe(
    (zodErr) => (
      /**
           * Take a ZodError and flatten it's issues into a single depth array
           */
      function gatherZodIssues (zodErr, status, contextCode) {
        return reduce(
          (issues, issue) =>
            pipe(
              cond([
                /**
                     * These issue codes indicate nested ZodErrors, so we resursively gather those
                     * See https://github.com/colinhacks/zod/blob/HEAD/ERROR_HANDLING.md#zodissuecode
                     */
                [
                  equals(ZodIssueCode.invalid_arguments),
                  () => gatherZodIssues(issue.argumentsError, 422, 'Invalid Arguments')
                ],
                [
                  equals(ZodIssueCode.invalid_return_type),
                  () => gatherZodIssues(issue.returnTypeError, 500, 'Invalid Return')
                ],
                [
                  equals(ZodIssueCode.invalid_union),
                  // An array of ZodErrors, so map over and flatten them all
                  () => chain((i) => gatherZodIssues(i, 400, 'Invalid Union'), issue.unionErrors)
                ],
                [T, () => [{ ...issue, status, contextCode }]]
              ]),
              concat(issues)
            )(issue.code),
          [],
          zodErr.issues
        )
      }(zodErr, 400, '')
    ),
    /**
         * combine all zod issues into a list of { message, status }
         * summaries of each issue
         */
    (zodIssues) =>
      reduce(
        (acc, zodIssue) => {
          const { message, path: _path, contextCode: _contextCode } = zodIssue
          /**
           * if object, path[1] will be the object key and path[0] '0', so just skip it
           * if string, path[0] will be the string and path[1] undefined
           */
          const path = _path[1] || _path[0]
          const contextCode = _contextCode ? `${_contextCode} ` : ''

          acc.push(`${contextCode}'${path}': ${message}.`)
          return acc
        },
        [],
        zodIssues
      ),
    join(' | ')
  )(zodErr)
}

/**
* Parse tags into a object with key-value pairs of name -> values.
*
* If multiple tags with the same name exist, it's value will be the array of tag values
* in order of appearance
*/
export function parseTags (rawTags) {
  return pipe(
    defaultTo([]),
    reduce(
      (map, tag) => pipe(
        // [value, value, ...] || []
        propOr([], tag.name),
        // [value]
        append(tag.value),
        // { [name]: [value, value, ...] }
        assoc(tag.name, __, map)
      )(map),
      {}
    ),
    /**
    * If the field is only a singly list, then extract the one value.
    *
    * Otherwise, keep the value as a list.
    */
    map((values) => values.length > 1 ? values : values[0])
  )(rawTags)
}

/**
 * Remove tags from the array by name. If value is provided,
 * then only remove tags whose both name and value matches.
 *
 * @param {string} name - the name of the tags to be removed
 * @param {string} [value] - the value of the tags to be removed
 */
export function removeTagsByNameMaybeValue (name, value) {
  return (tags) => reject(
    allPass([
      propEq(name, 'name'),
      ifElse(
        always(value),
        propEq(value, 'value'),
        T
      )
    ]),
    tags
  )
}

export function eqOrIncludes (val) {
  return cond([
    [is(String), equals(val)],
    [is(Array), includes(val)],
    [T, F]
  ])
}

/**
 * A function that, given a function, will immediately invoke it,
 * then retry it on errors, using an exponential backoff.
 *
 * If the final retry fails, then the overall Promise is rejected
 * with that error
 *
 * @param {function} fn - the function to be called
 * @param {{ maxRetries: number, delay: number, log: Logger, name: string }} param1 - the number of total retries and increased delay for each try
 */
export const backoff = (
  fn,
  { maxRetries = 3, delay = 500, log, name }
) => {
  /**
   * Recursive function that recurses with exponential backoff
   */
  const action = (retry, delay) => {
    return Promise.resolve()
      .then(fn)
      .catch((err) => {
        // Reached max number of retries
        if (retry >= maxRetries) {
          log(`(${name}) Reached max number of retries: ${maxRetries}. Bubbling err`)
          return Promise.reject(err)
        }

        /**
         * increment the retry count Retry with an exponential backoff
         */
        const newRetry = retry + 1
        const newDelay = delay + delay
        log(`(${name}) Backing off -- retry ${newRetry} starting in ${newDelay} milliseconds...`)
        /**
         * Retry in {delay} milliseconds
         */
        return new Promise((resolve) => setTimeout(resolve, delay))
          .then(() => action(newRetry, newDelay))
      })
  }

  return action(0, delay)
}

/**
 * Checks if a response is OK. Otherwise, throw response.
 *
 * @param {Response} res - The response to check
 * @returns
 */
export const okRes = (res) => {
  if (res.ok) return res
  throw res
}

/**
 * Checks if we are at a provided stage
 *
 * @param {String} stage - The stage to check against
 * @returns {Boolean} - Whether we are at the stage
 *
 * We also return true if ctx.stage is undefined.
 * This is to guard against functions accessing this util
 * from outside the task queue pipeline. If there is no stage,
 * we are outside the process pipeline, and this check should be ignored.
 */
export const checkStage = (stage) => {
  return (ctx) => {
    return !ctx.stage || ctx.stage === stage
  }
}

/**
 * Sets stage from prev stage to next stage
 *
 * @param {String | Array} prevStage
 * @param {String} nextStage
 * @returns {Object} - the mutated context object
 *
 * Sets the object's 'stage' value to nextStage.
 * Before we do this, we make sure we are at the expected
 * previous stage. This is to prevent overwriting stages
 * where we do not want to - when we are 'behind'.
 *
 * When recovering, we will 'skip over' all the stages that have
 * been previously completed. We want to avoid overwriting our stage
 * when we are in the catching up process.
 *
 * In some cases, there are multiple acceptable previous stages.
 * In these cases, we can pass in an array as prevStage, and check
 * against all of these stages.
 *
 */

export const setStage = (prevStage, nextStage) => {
  return (ctx) => {
    if (Array.isArray(prevStage) && prevStage.includes(ctx.stage)) return { ...ctx, stage: nextStage }
    if (ctx.stage === prevStage) {
      return { ...ctx, stage: nextStage }
    }
    return ctx
  }
}

// from https://github.com/then/is-promise/blob/master/index.js
export function isPromise (obj) {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function'
  )
}

/**
 * Given a function, it will return a function that swallows any errors. If an error is encountered,
 * undefined is returned, otherwise the result of the function is returned.
 *
 * In other words, a function wrapped with swallow will never throw an error.
 *
 * @param {Function} fn - The function to be wrapped.
 * @returns {Function} A new function that wraps the original function in a try-catch block.
 *
 * @example
 * const safeFunction = swallow(riskyFunction);
 * safeFunction(args); // Executes riskyFunction with args, but swallows any errors.
 */
export const swallow = (fn) => (...args) => {
  try {
    const res = fn(...args)
    if (isPromise(res)) return res.catch(() => {})
    return res
  } catch {}
}
