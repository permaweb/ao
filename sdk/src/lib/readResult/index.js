import { of } from 'hyper-async'

import { verifyInputWith } from './verify-input.js'
import { readWith } from './read.js'

/**
 * @typedef MessageResult
 * @property {any} output
 * @property {any[]} messages
 * @property {any[]} spawns
 * @property {string} [error]
 *
 * @typedef ReadResultArgs
 * @property {string} messageId - the transaction id of the message
 *
 * @callback ReadResult
 * @param {ReadResultArgs} args
 * @returns {Promise<MessageResult>} result
 *
 * @returns {ReadResult}
 */
export function readResultWith (env) {
  const verifyInput = verifyInputWith(env)
  const read = readWith(env)

  return ({ messageId }) => {
    return of({ id: messageId })
      .chain(verifyInput)
      .chain(read)
      .map(
        env.logger.tap(
          'readResult result for message "%s": %O',
          messageId
        )
      )
      .map(result => result)
      .toPromise()
  }
}
