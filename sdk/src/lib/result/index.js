import { identity } from 'ramda'
import { of } from 'hyper-async'

import { errFrom } from '../utils.js'
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
 * @property {string} message - the transaction id of the message
 *
 * @callback ReadResult
 * @param {ReadResultArgs} args
 * @returns {Promise<MessageResult>} result
 *
 * @returns {ReadResult}
 */
export function resultWith (env) {
  const verifyInput = verifyInputWith(env)
  const read = readWith(env)

  return ({ message }) => {
    return of({ id: message })
      .chain(verifyInput)
      .chain(read)
      .map(
        env.logger.tap(
          'readResult result for message "%s": %O',
          message
        )
      )
      .map(result => result)
      .bimap(errFrom, identity)
      .toPromise()
  }
}
