import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { equals, isNotNil, mergeRight, prop } from 'ramda'
import { z } from 'zod'

import { loadTransactionMetaSchema } from '../dal.js'
import { parseTags } from './utils.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  tags: z.record(z.any()),
  state: z.record(z.any())
}).passthrough()

/**
 * @callback LoadProcessMeta
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<string>}
 *
 * @param {Env} env
 * @returns {LoadProcessMeta}
 */
function getProcessMetaWith ({ loadTransactionMeta, logger }) {
  loadTransactionMeta = fromPromise(
    loadTransactionMetaSchema.implement(loadTransactionMeta)
  )

  const checkTag = (name, pred) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}' of value '${tags[name]}' was not valid on transaction`)

  return (processId) => {
    return loadTransactionMeta(processId)
      .map(prop('tags'))
      .map(parseTags)
      .chain(checkTag('Data-Protocol', equals('ao')))
      .chain(checkTag('ao-type', equals('process')))
      .chain(checkTag('Contract-Src', isNotNil))
      .bimap(
        logger.tap('Verifying process failed: %s'),
        logger.tap('Verified process')
      )
      /**
       * In ao, simply the tags on the DataItem are the state.
       *
       * So we generate a key-value map of the tags and set them
       * as state
       */
      .map(tags => ({ tags, state: tags }))
  }
}

/**
 * @typedef Args
 * @property {string} id - the id of the contract
 *
 * @typedef Result
 * @property {string} id - the id of the contract
 * @property {ArrayBuffer} src - an array buffer that contains the Contract Wasm Src
 *
 * @callback LoadProcess
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {LoadProcess}
 */
export function loadProcessWith (env) {
  const logger = env.logger.child('loadProcess')
  env = { ...env, logger }

  const getProcessMeta = getProcessMetaWith(env)

  return (ctx) => {
    return of(ctx.id)
      .chain(getProcessMeta)
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded process and appended to ctx'))
  }
}
