import {
  T, always, chain, concat, cond, equals,
  has, identity, is, join, pipe, prop, reduce
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
