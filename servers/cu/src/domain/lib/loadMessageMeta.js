import { fromPromise } from 'hyper-async'
import { z } from 'zod'
import { loadMessageMetaSchema } from '../dal'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  processId: z.any().refine((val) => !!val, {
    message: 'processId must be attached to context'
  }),
  sortKey: z.string().refine((val) => !!val, {
    message: 'sortKey must be attached to context'
  })
}).passthrough()

/**
 * @typedef Args
 * @property {string} messageTxId - the transaction id of the message
 *
 * @typedef Result
 * @property {string} processId - the id of the process that the message is for
 * @property {string} sortKey - the sort key of the message
 *
 * @callback LoadMessageMeta
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {LoadMessageMeta}
 */
export function loadMessageMetaWith (env) {
  const logger = env.logger.child('loadMessageMeta')
  env = { ...env, logger }

  const loadMessageMeta = fromPromise(loadMessageMetaSchema.implement(env.loadMessageMeta))

  return (ctx) => {
    return loadMessageMeta({ messageTxId: ctx.messageTxId })
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded message process and sortKey and appended to ctx %j'))
  }
}
