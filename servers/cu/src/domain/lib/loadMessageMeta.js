import { Rejected, Resolved, fromPromise } from 'hyper-async'
import { z } from 'zod'

import { findProcessSchema, loadMessageMetaSchema, locateProcessSchema, locateSchedulerSchema } from '../dal.js'
import { findRawTag, trimSlash } from '../utils.js'

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
  timestamp: z.number().refine((val) => !!val, {
    message: 'timestamp must be attached to context'
  }),
  /**
   * nonce can be 0, so we can't just use falsey here.
   *
   * So instead cast to null and compare
   */
  nonce: z.number().refine((val) => val != null, {
    message: 'nonce must be attached to context'
  })
}).passthrough()

function maybeCachedWith ({ locateScheduler, findProcess, logger }) {
  locateScheduler = fromPromise(locateSchedulerSchema.implement(locateScheduler))
  findProcess = fromPromise(findProcessSchema.implement(findProcess))

  /**
   * Attempt to use the cached process to locate the scheduler
   * via it's Scheduler-Location record, which prevents potentially
   * calling a gateway to load a process
   */
  return (processId) => findProcess({ processId })
    .map((process) => findRawTag('Scheduler', process.tags))
    .chain((tag) => tag ? Resolved(tag.value) : Rejected('No Cached Process'))
    .chain(locateScheduler)
    .bichain(
      (err) => {
        logger(
          'Could not locateScheduler for process "%s" using cache. Falling back to using scheduler-utils locate',
          processId, err
        )
        return Rejected(processId)
      },
      Resolved
    )
}

/**
 * @typedef Args
 * @property {string} messageTxId - the transaction id of the message
 *
 * @typedef Result
 * @property {string} processId - the id of the process that the message is for
 * @property {string} timestamp - the timestamp of the message
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
  const locateProcess = fromPromise(locateProcessSchema.implement(env.locateProcess))

  const maybeCached = maybeCachedWith(env)

  return (ctx) => {
    return maybeCached(ctx.processId)
      .bichain(locateProcess, Resolved)
      .chain(({ url }) => loadMessageMeta({
        suUrl: trimSlash(url),
        processId: ctx.processId,
        messageTxId: ctx.messageTxId
      }))
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded message process and timestamp and appended to ctx %j'))
  }
}
