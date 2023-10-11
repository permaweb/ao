import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { applySpec, assoc, equals, isNotNil, pipe, prop, reduce } from 'ramda'
import { z } from 'zod'

import { loadTransactionDataSchema, loadTransactionMetaSchema } from '../dal.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  src: z.any().refine((val) => !!val, {
    message: 'process src must be attached to context'
  }),
  srcId: z.string().refine((val) => !!val, {
    message: 'process srcId must be attached to context'
  })
}).passthrough()

/**
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the transaction
 * @returns {Async<any>}
 *
 * @callback LoadTransaction
 * @param {string} id - the id of the transaction
 * @returns {Async<Response>}
 *
 * @typedef Env
 * @property {LoadTransactionMeta} loadTransactionMeta
 * @property {LoadTransaction} loadTransactionData
 */

/**
 * @callback LoadSourceBuffer
 * @param {string} srcId
 * @returns {Async<ArrayBuffer>}
 *
 * @param {Env} env
 * @returns {LoadSourceBuffer}
 */
function getSourceBufferWith ({ loadTransactionData }) {
  loadTransactionData = fromPromise(
    loadTransactionDataSchema.implement(loadTransactionData)
  )

  return (srcId) => {
    return loadTransactionData(srcId)
      .chain(fromPromise((res) => res.arrayBuffer()))
  }
}

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
    : Rejected(`Tag '${name}' of value '${tags[name]}' was not valid on contract source`)

  return (processId) => {
    return loadTransactionMeta(processId)
      .map(prop('tags'))
      .map(reduce((a, t) => assoc(t.name, t.value, a), {}))
      .chain(checkTag('Content-Type', equals('application/wasm')))
      .chain(checkTag('Contract-Type', equals('ao')))
      .chain(checkTag('Contract-Src', isNotNil))
      .bimap(
        logger.tap('Verifying process source failed: %s'),
        logger.tap('Verified process source')
      )
      .map(applySpec({
        srcId: pipe(
          prop('Contract-Src'),
          logger.tap('Found Contract-Src id: %s')
        )
      }))
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
 * @callback LoadSource
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {LoadSource}
 */
export function loadSourceWith (env) {
  const logger = env.logger.child('loadProcess')
  env = { ...env, logger }

  const getProcessMeta = getProcessMetaWith(env)
  const getSourceBuffer = getSourceBufferWith(env)

  return (ctx) => {
    return of(ctx.id)
      .chain(getProcessMeta)
      .chain(({ srcId }) =>
        getSourceBuffer(srcId).map((src) => ({ ...ctx, srcId, src }))
      )
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded process source and appended to ctx'))
  }
}
