import { readStateWith } from './readState.js'
import { gatherCronOutboxesWith } from './lib/gatherCronOutboxes.js'

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
export function readCronOutboxesWith (env) {
  const gatherCronMessages = gatherCronOutboxesWith(env)
  const readState = readStateWith(env)

  return ({ processId, from, to }) => {
    return readState({ processId, to })
      .chain(() => gatherCronMessages({ processId, from, to }))
      .map(output => output.messages)
      .map(env.logger.tap(
        'readCronMessages result for process %s from "%s" to "%s" and appended to ctx %j',
        processId,
        from,
        to || 'latest'
      ))
  }
}
