import { of } from 'hyper-async'

import { loadProcessWith } from './lib/loadProcess.js'
import { loadSourceWith } from './lib/loadSource.js'
import { loadMessagesWith } from './lib/loadMessages.js'
import { evaluateWith } from './lib/evaluate.js'

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
 * @property {string} to
 *
 * @callback ReadState
 * @param {ReadStateArgs} args
 * @returns {Promise<State>} result
 *
 * @param {Env} - the environment
 * @returns {ReadState}
 */
export function readStateWith (env) {
  const loadProcess = loadProcessWith(env)
  const loadSource = loadSourceWith(env)
  const loadMessages = loadMessagesWith(env)
  const evaluate = evaluateWith(env)

  return ({ processId, to }) => {
    return of({ id: processId, to })
      .chain(loadProcess)
      .chain(loadSource)
      .chain(loadMessages)
      .chain(evaluate)
      .map((ctx) => ctx.output)
      .map(
        env.logger.tap(
          'readState result for process "%s" to interaction "%s": %O',
          processId,
          to || 'latest'
        )
      )
  }
}
