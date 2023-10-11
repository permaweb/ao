import { fromPromise, of } from 'hyper-async'
import { mergeRight } from 'ramda'
import { z } from 'zod'

import { messageSchema } from '../model.js'
import { loadMessagesSchema } from '../dal.js'

function loadSequencedMessagesWith ({ loadMessages }) {
  loadMessages = fromPromise(
    loadMessagesSchema.implement(loadMessages)
  )
  return (args) => of(args)
}

function loadScheduledMessagesWith () {
  return (args) =>
    of(args)
}

function mergeMessageWith () {
  return ({ sequenced, scheduled }) =>
    of([...sequenced, ...scheduled])
}

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  messages: z.array(messageSchema)
}).passthrough()

/**
 * @typedef LoadMessagesArgs
 * @property {string} id - the contract id
 * @property {string} [from] - the lowermost sortKey
 * @property {string} [to] - the highest sortKey
 *
 * @typedef LoadMessagesResults
 * @property {any[]} messages
 *
 * @callback LoadMessages
 * @param {LoadMessagesArgs} args
 * @returns {Async<LoadMessagesResults & LoadMessagesArgs>}
 *
 * @typedef Env
 * @property {LoadMessages} loadInteractions
 */

/**
 * @param {Env} env
 * @returns {LoadMessages}
 */
export function loadMessagesWith (env) {
  const logger = env.logger.child('loadMessages')
  env = { ...env, logger }

  const loadSequencedMessages = loadSequencedMessagesWith(env)
  const loadScheduledMessages = loadScheduledMessagesWith(env)
  const mergeMessages = mergeMessageWith(env)

  return (ctx) =>
    of(ctx)
      .chain(loadSequencedMessages)
      .chain(loadScheduledMessages)
      .chain(mergeMessages)
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded messages and appended to context %j'))
}
