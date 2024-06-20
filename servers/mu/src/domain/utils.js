import {
  F, T, __, allPass, always, append, assoc, chain, concat, cond, defaultTo, equals,
  has, ifElse, includes, is, join, map, pipe, propEq, propOr, reduce, reject
} from 'ramda'
import { ZodError, ZodIssueCode } from 'zod'

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
 * @param {Respones} res - The response to check
 * @returns
 */
export const okRes = (res) => {
  if (res.ok) return res
  throw res
}
