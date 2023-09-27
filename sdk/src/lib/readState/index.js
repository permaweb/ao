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
 * @callback ReadState
 * @param {string} contractId
 * @param {string} sortKeyHeight
 * @returns {Promise<ContractResult>} result
 *
 * @param {Env} - the environment
 * @returns {ReadState}
 */
export function readStateWith (env) {
  const verifyInput = verifyInputWith(env)
  const read = readWith(env)

  return (contractId, sortKey) => {
    return of({ id: contractId, sortKey })
      .chain(verifyInput)
      .chain(read)
      .map(
        env.logger.tap(
          'readState result for contract "%s" to sortKey "%s": %O',
          contractId,
          sortKey || 'latest'
        )
      )
      .toPromise()
  }
}
