import { omit } from 'ramda'
import { of } from 'hyper-async'

import { readStateWith } from './readState.js'
import { loadMessageMetaWith } from '../lib/loadMessageMeta.js'

/**
 * @typedef Env
 *
 * @typedef Result
 *
 * @typedef ReadResultArgs
 * @property {string} messageUid
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

  return ({ processId, messageUid }) => {
    return of({ processId, messageUid })
      .chain(loadMessageMeta)
      .chain(res => readState({
        processId: res.processId,
        messageId: messageUid,
        to: res.timestamp,
        /**
         * The ordinate for a scheduled message is it's nonce
         */
        ordinate: `${res.nonce}`,
        /**
         * We know this is a scheduled message, and so has no
         * associated cron.
         *
         * So we explicitly set cron to undefined, for posterity
         */
        cron: undefined,
        needsOnlyMemory: false
      }))
      .map((res) => ({
        output: omit(['Memory'], res.output),
        last: res.exact
          /**
           * The message was cached, and so not eval stream
           * was spun up, so map the cached value to the
           * shape of 'last'
           */
          ? {
              id: res.messageId,
              timestamp: res.from,
              blockHeight: res.fromBlockHeight,
              ordinate: res.ordinate,
              cron: res.fromCron
            }
          : res.last,
        isColdStart: res.isColdStart,
        exact: res.exact,
        stats: res.stats
      }))
  }
}
