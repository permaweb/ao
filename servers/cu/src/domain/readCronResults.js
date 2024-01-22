import { readStateWith } from './readState.js'
import { gatherResultsWith } from './lib/gatherResults.js'
import { maybeParseCursor } from './utils.js'

/**
 * @typedef Env
 *
 * @typedef Result
 *
 * @typedef ReadCronMessagesArgs
 * @property {string} processId
 * @property {string} from
 * @property {string} to
 *
 * @callback ReadCronMessages
 * @param {ReadCronMessagesArgs} args
 * @returns {Promise<Result>} result
 *
 * @param {Env} - the environment
 * @returns {ReadCronMessages}
 */
export function readCronResultsWith (env) {
  const gatherResults = gatherResultsWith(env)
  const readState = readStateWith(env)

  return ({ processId, from, to, limit }) => {
    /**
     * 'to' could be a cursor, so before passing to readState and 'catching up' evaluations,
     * we need to potentially parse it, then grab the timestamp and ordinate from the parsed data
     */
    return maybeParseCursor('to')({ processId, from, to, limit })
      .chain((ctx) => readState({ processId, to: ctx.to.timestamp, ordinate: ctx.to.ordinate }))
      /**
       * Now 'caught up' on evaluations, so now we can gather the results, using the filtering
       * criteria
       */
      .chain(() => gatherResults({
        processId,
        from,
        to,
        /**
         * Crons may only be traversed in ascending order
         */
        sort: 'ASC',
        limit: limit || Number.MAX_SAFE_INTEGER,
        /**
         * Only gather Cron Message evaluation results
         */
        onlyCron: true
      }))
      .map((res) => {
        env.logger(
          'gathered Cron Evaluation results for process %s from "%s" to "%s"',
          processId,
          from,
          to || 'latest'
        )

        return res
      })
  }
}
