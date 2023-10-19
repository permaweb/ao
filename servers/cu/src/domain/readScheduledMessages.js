import { readStateWith } from './readState.js'
import { gatherScheduledMessagesWith } from './lib/gatherScheduledMessages.js'

/**
 * @typedef Env
 *
 * @typedef Result
 *
 * @typedef ReadResultArgs
 * @property {string} processId
 * @property {string} from
 * @property {string} to
 *
 * @callback ReadResult
 * @param {ReadResultArgs} args
 * @returns {Promise<Result>} result
 *
 * @param {Env} - the environment
 * @returns {ReadResult}
 */
export function readScheduledMessagesWith (env) {
  const gatherScheduledMessages = gatherScheduledMessagesWith(env)
  const readState = readStateWith(env)

  return ({ processId, from, to }) => {
    return readState({ processId, to })
      .chain(() => gatherScheduledMessages({ processId, from, to }))
      .map(output => output.messages)
      .map(env.logger.tap(
        'readScheduledMessages result for process %s from "%s" to "%s" and appended to ctx %j',
        processId,
        from,
        to || 'latest'
      ))
      .toPromise()
  }
}
