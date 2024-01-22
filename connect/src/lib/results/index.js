import { identity } from 'ramda'
import { of } from 'hyper-async'

import { errFrom } from '../utils.js'
import { verifyInputWith } from './verify-input.js'
import { queryWith } from './query.js'

/**
 * @typedef MessageResult
 * @property {any} Output
 * @property {any[]} Messages
 * @property {any[]} Spawns
 * @property {any} [Error]
 *
 * @typedef ReadResultArgs
 * @property {string} message - the transaction id of the message
 * @property {string} process - the transaction id of the process that received the message
 *
 * @callback ReadResult
 * @param {ReadResultArgs} args
 * @returns {Promise<MessageResult>} result
 *
 * @returns {ReadResult}
 */
export function resultsWith (env) {
  const verifyInput = verifyInputWith(env)
  const query = queryWith(env)

  return ({ process, from, to, sort }) => {
    return of({ process, from, to, sort })
      .chain(verifyInput)
      .chain(query)
      .map(
        env.logger.tap(
          'readResults result for message "%s": %O',
          process
        )
      )
      .map(result => result)
      .bimap(errFrom, identity)
      .toPromise()
  }
}
