import { readStateWith } from './readState.js'
import { gatherScheduledMessagesWith } from './lib/gatherScheduledMessages.js'

/**
 * @typedef Env
 *
 * @typedef Result
 *
 * @typedef ReadScheduledMessagesArgs
 * @property {string} processId
 * @property {string} from
 * @property {string} to
 *
 * @callback ReadScheduledMessages
 * @param {ReadScheduledMessagesArgs} args
 * @returns {Promise<Result>} result
 *
 * @param {Env} - the environment
 * @returns {ReadScheduledMessages}
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
  }
}
