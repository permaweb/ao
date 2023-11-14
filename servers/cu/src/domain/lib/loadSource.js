import { fromPromise, of } from 'hyper-async'
import { mergeRight, prop } from 'ramda'
import { z } from 'zod'

import { loadTransactionDataSchema } from '../dal.js'
import { parseTags } from './utils.js'

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

function getSourceBufferWith ({ loadTransactionData }) {
  loadTransactionData = fromPromise(loadTransactionDataSchema.implement(loadTransactionData))

  return (tags) => {
    return of(tags)
      .map(parseTags)
      .map(prop('Contract-Src'))
      .chain(srcId =>
        of(srcId)
          .chain(loadTransactionData)
          .chain(fromPromise((res) => res.arrayBuffer()))
          .map(src => ({ src, srcId }))
      )
  }
}

/**
 * @typedef Args
 * @property {string} id - the id of the process
 *
 * @typedef Result
 * @property {string} srcId - the id of the process source
 * @property {ArrayBuffer} src - an array buffer that contains the Contract Wasm Src
 *
 * @callback LoadSource
 * @param {Args} args
 * @returns {Async<Result & Args>}
 *
 * @param {any} env
 * @returns {LoadSource}
 */
export function loadSourceWith (env) {
  const logger = env.logger.child('loadSource')
  env = { ...env, logger }

  const getSourceBuffer = getSourceBufferWith(env)

  return (ctx) => {
    return of(ctx.tags)
      .chain(getSourceBuffer)
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
      .map(ctx => {
        logger('Loaded source and appended to ctx')
        return ctx
      })
  }
}
