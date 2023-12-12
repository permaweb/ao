import { fromPromise, of } from 'hyper-async'
import { mergeRight, prop } from 'ramda'
import { z } from 'zod'

import { loadTransactionDataSchema } from '../dal.js'
import { parseTags } from '../utils.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  module: z.any().refine((val) => !!val, {
    message: 'process module must be attached to context'
  }),
  moduleId: z.string().refine((val) => !!val, {
    message: 'process moduleId must be attached to context'
  })
}).passthrough()

function getModuleBufferWith ({ loadTransactionData }) {
  loadTransactionData = fromPromise(loadTransactionDataSchema.implement(loadTransactionData))

  return (tags) => {
    return of(tags)
      .map(parseTags)
      .map(prop('Module'))
      .chain(moduleId =>
        of(moduleId)
          .chain(loadTransactionData)
          .chain(fromPromise((res) => res.arrayBuffer()))
          .map(module => ({ module, moduleId }))
      )
  }
}

/**
 * @typedef Args
 * @property {string} id - the id of the process
 *
 * @typedef Result
 * @property {string} moduleId - the id of the process source
 * @property {ArrayBuffer} module - an array buffer that contains the Contract Wasm Src
 *
 * @callback LoadModule
 * @param {Args} args
 * @returns {Async<Result & Args>}
 *
 * @param {any} env
 * @returns {LoadModule}
 */
export function loadModuleWith (env) {
  const logger = env.logger.child('loadModule')
  env = { ...env, logger }

  const getModuleBuffer = getModuleBufferWith(env)

  return (ctx) => {
    return of(ctx.tags)
      .chain(getModuleBuffer)
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
      .map(ctx => {
        logger('Loaded source and appended to ctx')
        return ctx
      })
  }
}
