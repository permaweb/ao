// import { pathOr } from 'ramda'

// import { readStateWith } from './readState.js'
import { gatherResultsWith } from '../lib/gatherResults.js'
import { maybeParseCursor } from '../utils.js'

/**
 * @typedef Env
 *
 * @typedef Result
 *
 * @typedef ReadMessagesArgs
 * @property {string} processId
 * @property {string} from
 * @property {string} to
 *
 * @callback ReadMessages
 * @param {ReadMessagesArgs} args
 * @returns {Promise<Result>} result
 *
 * @param {Env} - the environment
 * @returns {ReadMessages}
 */
export function readResultsWith (env) {
  const gatherResults = gatherResultsWith(env)
  // const readState = readStateWith(env)

  return ({ processId, from, to, limit, sort }) => {
    /**
     * 'to' could be a cursor, so before passing to readState and 'catching up' evaluations,
     * we need to potentially parse it, then grab the timestamp and ordinate from the parsed data
     */
    return maybeParseCursor('to')({ processId, from, to, limit, sort })
    // .chain((ctx) => readState({
    //   processId,
    //   to: pathOr(undefined, ['to', 'timestamp'], ctx),
    //   ordinate: pathOr(undefined, ['to', 'ordinate'], ctx),
    //   cron: pathOr(undefined, ['to', 'cron'], ctx)
    // }))
      /**
       * Now 'caught up' on evaluations, so now we can gather the results, using the filtering
       * criteria
       */
      .chain(() => gatherResults({
        processId,
        from,
        to,
        sort,
        /**
         * We fetch an additional evaluation to know whether or not
         * there are additional pages to fetch.
         */
        limit: limit + 1,
        onlyCron: false
      }))
      .map((res) => {
        env.logger(
          'gathered Evaluation results for process %s from "%s" to "%s"',
          processId,
          from || 'earliest',
          to || 'latest'
        )

        return res
      })
  }
}
