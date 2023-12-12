import {
  F, T, __, always, append, assoc, chain, concat, cond, defaultTo, equals,
  filter, has, head, identity, includes, is, join, map, pipe, prop, propOr, reduce
} from 'ramda'
import { ZodError, ZodIssueCode } from 'zod'

export function errFrom (err) {
  err = err || { message: 'An error occurred' }

  const message = pipe(
    cond([
      [is(ZodError), mapZodErr],
      [has('message'), prop('message')],
      [is(String), identity],
      [T, always('An error occurred')]
    ])
  )(err)

  const e = new Error(message)
  e.stack += err.stack || ''
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

export function eqOrIncludes (val) {
  return cond([
    [is(String), equals(val)],
    [is(Array), includes(val)],
    [T, F]
  ])
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

/**
* Pad the block height portion of the sortKey to 12 characters
*
* This should work to increment and properly pad any sort key:
* - 000001257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (full Sequencer sort key)
* - 000001257294,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (Smartweave protocol sort key)
* - 1257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (missing padding)
* - 1257294 (just block height)
*
* @param {string} sortKey - the sortKey to be padded. If the sortKey is of sufficient length, then no padding
* is added.
*/
export function padBlockHeight (sortKey) {
  if (!sortKey) return sortKey
  const [height, ...rest] = String(sortKey).split(',')
  return [height.padStart(12, '0'), ...rest].join(',')
}
