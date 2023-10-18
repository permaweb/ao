import { of } from 'hyper-async'

import { readStateWith } from './readState.js'
import { loadMessageMetaWith } from './lib/loadMessageMeta.js'

/**
 * @typedef Env
 *
 * @typedef Result
 *
 * @typedef ReadResultArgs
 * @property {string} messageTxId
 *
 * @callback ReadResult
 * @param {ReadResultArgs} args
 * @returns {Promise<Result>} result
 *
 * @param {Env} - the environment
 * @returns {ReadResult}
 */
export function readResultWith (env) {
  const loadMessageMeta = loadMessageMetaWith(env)
  const readState = readStateWith(env)

  return ({ messageTxId }) => {
    return of({ messageTxId })
      .chain(loadMessageMeta)
      .chain(res => readState({ processId: res.processId, to: res.sortKey }))
      .map(output => output.result)
      .map(
        env.logger.tap(
          'readResult result for message with txId %s',
          messageTxId
        )
      )
      .toPromise()
  }
}
