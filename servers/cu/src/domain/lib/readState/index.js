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
 * @typedef State
 * @property {any} state
 * @property {any} result
 *
 * @typedef ReadStateArgs
 * @property {string} processId
 * @property {string} messageId
 *
 * @callback ReadState
 * @param {ReadStateArgs} args
 * @returns {Promise<State>} result
 *
 * @param {Env} - the environment
 * @returns {ReadState}
 */
export function readStateWith (env) {
  const loadSource = loadSourceWith(env)
  const loadState = loadStateWith(env)
  const loadActions = loadActionsWith(env)
  const evaluate = evaluateWith(env)

  return ({ processId, messageId }) => {
    return of({ id: processId, to: messageId })
      .chain(loadSource)
      .chain(loadState)
      .chain(loadActions)
      .chain(evaluate)
      .map((ctx) => ctx.output)
      .map(
        env.logger.tap(
          'readState result for process "%s" to message "%s": %O',
          processId,
          messageId || 'latest'
        )
      )
      .toPromise()
  }
}
