import { of } from 'hyper-async'

import { loadSourceWith } from './load-src.js'
import { loadStateWith } from './load-state.js'
import { loadActionsWith } from './load-actions.js'
import { evaluateWith } from './evaluate.js'

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
  const loadSource = loadSourceWith(env)
  const loadState = loadStateWith(env)
  const loadActions = loadActionsWith(env)
  const evaluate = evaluateWith(env)

  return (contractId, sortKeyHeight) => {
    return of({ id: contractId, to: sortKeyHeight })
      .chain(loadSource)
      .chain(loadState)
      .chain(loadActions)
      .chain(evaluate)
      .map((ctx) => ctx.output)
      .map(
        env.logger.tap(
          'readState result for contract "%s" to sortKey "%s": %O',
          contractId,
          sortKeyHeight || 'latest'
        )
      )
      .toPromise()
  }
}
