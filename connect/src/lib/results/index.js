import { identity } from 'ramda'
import { of } from 'hyper-async'

import { errFrom } from '../utils.js'
import { verifyInputWith } from './verify-input.js'
import { queryWith } from './query.js'

/**
 * @typedef PageInfo
 * @property {boolean} hasNextPage
 *
 * @typedef Result
 * @property {any} Output
 * @property {any[]} Messages
 * @property {any[]} Spawns
 * @property {any} [Error]
 *
 * @typedef Edge
 * @property {Result} node
 * @property {string} cursor
 *
 * @typedef Response
 * @property {PageInfo} pageInfo
 * @property {Edge[]} edges
 *
 * @typedef ReadResultsArgs
 * @property {string} process
 * @property {string} [from]
 * @property {string} [to]
 * @property {number} [limit]
 * @property {string} [sort]
 *
 * @callback ReadResults
 * @param {ReadResultsArgs} args
 * @returns {Promise<MessageResult>} result
 *
 * @returns {ReadResults}
 */
export function resultsWith (env) {
  const verifyInput = verifyInputWith(env)
  const query = queryWith(env)

  return ({ process, from, to, sort, limit }) => {
    return of({ process, from, to, sort, limit })
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
