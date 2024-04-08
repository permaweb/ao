import { Rejected, Resolved } from 'hyper-async'
import {
  F, T, __, allPass, always, append, assoc, chain, concat, cond, defaultTo, equals,
  filter, has, head, ifElse, includes, is, join, map, pipe, propEq, propOr, reduce, reject
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
  let { GATEWAY_URL, ARWEAVE_URL, GRAPHQL_URL, CHECKPOINT_GRAPHQL_URL, ...theRestOfTheConfig } = envConfig

  if (ARWEAVE_URL && GRAPHQL_URL && CHECKPOINT_GRAPHQL_URL) return envConfig

  if (!GATEWAY_URL) {
    if (!ARWEAVE_URL && !GRAPHQL_URL) throw 'GATEWAY_URL is required, if either ARWEAVE_URL or GRAPHQL_URL is not provided'
    if (!ARWEAVE_URL) throw 'GATEWAY_URL is required if ARWEAVE_URL is not provided'
    if (!GRAPHQL_URL) throw 'GATEWAY_URL is required if GRAPHQL_URL is not provided'
  }

  if (!ARWEAVE_URL) ARWEAVE_URL = GATEWAY_URL
  if (!GRAPHQL_URL) GRAPHQL_URL = joinUrl({ url: GATEWAY_URL, path: '/graphql' })
  if (!CHECKPOINT_GRAPHQL_URL) CHECKPOINT_GRAPHQL_URL = GRAPHQL_URL

  return { ARWEAVE_URL, GRAPHQL_URL, CHECKPOINT_GRAPHQL_URL, ...theRestOfTheConfig }
}
/* eslint-enable no-throw-literal */

export const isNamed = has('name')

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

  /**
   * If this is a named error, we make sure to include its name
   * in the error message
   */
  if (!is(ZodError, err) && isNamed(err)) e.message = `${err.name}: ${e.message}`

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

export function mapFrom ({ tags, owner }) {
  const tag = findRawTag('From-Process', tags)
  /**
   * Not forwarded, so the signer is the who the message is from
   */
  if (!tag || !tag.value) return owner
  /**
   * Forwarded, so the owner is who the message was forwarded on behalf of
   * (the From-Process) value
   */
  return tag.value
}

export function mapForwardedBy ({ tags, owner }) {
  const tag = findRawTag('From-Process', tags)
  /**
   * Not forwarded by a MU, so simply not set
   */
  if (!tag) return undefined
  /**
   * Forwarded by a MU, so use the signer (the MU wallet)
   * as the Forwarded-By value
   */
  return owner
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

export function trimSlash (str = '') {
  if (!str.endsWith('/')) return str
  return trimSlash(str.slice(0, -1))
}

export function findRawTag (name, tags) {
  return pipe(
    defaultTo([]),
    filter(tag => tag.name === name),
    /**
     * TODO: what if multiple tags with same name?
     * For now, just grabbing the first one
     */
    head
  )(tags)
}

export function maybeBase64Object (base64) {
  if (!base64) return Rejected('falsey is not a base64 encoded object')

  try {
    return Resolved(JSON.parse(atob(base64)))
  } catch (err) {
    return Rejected(`Not a base64 encoded object: ${err.message}`)
  }
}

export function evaluationToCursor (evaluation, sort) {
  return btoa(JSON.stringify({
    timestamp: evaluation.timestamp,
    ordinate: evaluation.ordinate,
    cron: evaluation.cron,
    sort
  }))
}

export function maybeParseCursor (name) {
  return (ctx) => ctx[name]
    ? maybeBase64Object(ctx[name])
      .bichain(
        /**
         * Defined, but not base64 cursor, so assume it's a timestamp,
         * and construct the criteria only containing the timestamp
         */
        () => Resolved(assoc(name, { timestamp: ctx[name] }, ctx)),
        /**
         * The value was a cursor, so continue
         */
        (criteria) => Resolved(assoc(name, criteria, ctx))
      )
    /**
     * Map all falsey values to undefined
     */
    : Resolved(assoc(name, undefined, ctx))
}

export async function busyIn (millis, p, busyFn) {
  if (!millis) return p

  return Promise.race([
    p,
    new Promise((resolve) => setTimeout(resolve, millis)).then(busyFn)
  ])
}

export function isLaterThan (eval1, eval2) {
  const t1 = `${eval1.timestamp}`
  const t2 = `${eval2.timestamp}`
  /**
   * timestamps are equal some might be two crons on overlapping interval,
   * so compare the crons
   */
  if (t2 === t1) return (eval2.cron || '') > (eval1.cron || '')

  return t2 > t1
}

export function isEarlierThan (eval1, eval2) {
  const t1 = `${eval1.timestamp}`
  const t2 = `${eval2.timestamp}`
  /**
   * timestamps are equal some might be two crons on overlapping interval,
   * so compare the crons
   */
  if (t2 === t1) return (eval2.cron || '') < (eval1.cron || '')

  return t2 < t1
}

export function isEqualTo (eval1, eval2) {
  const t1 = `${eval1.timestamp}`
  const t2 = `${eval2.timestamp}`

  return t2 === t1 &&
    (eval2.cron || '') === (eval1.cron || '')
}

export const findPendingForProcessBeforeWith = (map) => ({ processId, timestamp }) => {
  if (!timestamp) return // latest

  timestamp = parseInt(timestamp)
  let latestBefore // string | undefined
  /**
   * Try to find a pending eval stream to chain off of
   */
  for (const [key] of map.entries()) {
    if (!key.startsWith(processId)) continue

    /**
     * TODO: pending is evaling to latest at the time of request.
     * Maybe a way to chain off "earlier latest"
     *
     * For now, disregarding
     */
    let [, cur] = key.split(',')
    if (!cur) continue

    cur = parseInt(cur)
    if (cur >= timestamp) continue

    /**
     * Current pending is before the timestamp we're interested in,
     * so we might could daisychain off of it, evaling
     * where it left off
     */
    if (!latestBefore) latestBefore = key
    else {
      const [, latest] = latestBefore.split(',')
      if (cur > parseInt(latest)) latestBefore = key
    }
  }

  if (latestBefore) return [latestBefore, map.get(latestBefore)]
}
