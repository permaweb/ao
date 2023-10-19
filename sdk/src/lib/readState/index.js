import { of } from 'hyper-async'

import { verifyInputWith } from './verify-input.js'
import { readWith } from './read.js'

/**
 * @typedef Env
 * @property {any} loadTransactionData
 * @property {any} loadTransactionMeta
 * @property {any} sequencer
 * @property {any} db
 *
 * @typedef ContractResult
 * @property {any} state
 * @property {any} result
 *
 * @typedef ReadStateArgs
 * @property {string} processId
 * @property {string} [sortKey]
 *
 * @callback ReadState
 * @param {ReadStateArgs} args
 * @returns {Promise<ContractResult>} result
 *
 * @param {Env} - the environment
 * @returns {ReadState}
 */
export function readStateWith (env) {
  const verifyInput = verifyInputWith(env)
  const read = readWith(env)

  return ({ processId, sortKey }) => {
    return of({ id: processId, sortKey })
      .chain(verifyInput)
      .chain(read)
      .map(
        env.logger.tap(
          'readState result for process "%s" to sortKey "%s": %O',
          processId,
          sortKey || 'latest'
        )
      )
      .map(state => state)
      .toPromise()
  }
}
