import { Resolved, of } from 'hyper-async'

import { loadProcessWith } from './lib/loadProcess.js'
import { loadModuleWith } from './lib/loadModule.js'
import { loadMessagesWith } from './lib/loadMessages.js'
import { evaluateWith } from './lib/evaluate.js'
import { hydrateMessagesWith } from './lib/hydrateMessages.js'

/**
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
 * @returns {ReadState}
 */
export function readStateWith (env) {
  const loadProcess = loadProcessWith(env)
  const loadMessages = loadMessagesWith(env)
  const hydrateMessages = hydrateMessagesWith(env)
  const loadModule = loadModuleWith(env)
  const evaluate = evaluateWith(env)

  return ({ processId, to }) => {
    return of({ id: processId, to })
      .chain(loadProcess)
      .chain(res => {
        /**
         * The exact evaluation (identified by its input messages timestamp)
         * was found in the cache, so just return it
         */
        if (res.from === to) {
          env.logger('Exact match to cached evaluation for message "%s" to process "%s"', to, processId)
          return Resolved(res.result)
        }

        return of(res)
          .chain(loadMessages)
          .chain(hydrateMessages)
          .chain(loadModule)
          .chain(evaluate)
          .map((ctx) => ctx.output)
      })
  }
}
