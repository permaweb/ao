import { fromPromise, of, Resolved, Rejected } from 'hyper-async'
import { mergeRight, prop } from 'ramda'
import { z } from 'zod'

import { loadTransactionDataSchema, loadTransactionMetaSchema } from '../dal.js'
import { eqOrIncludes, parseTags } from '../utils.js'

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

function getModuleWith ({ loadTransactionData, loadTransactionMeta }) {
  loadTransactionData = loadTransactionDataSchema.implement(loadTransactionData)
  loadTransactionMeta = loadTransactionMetaSchema.implement(loadTransactionMeta)

  const checkTag = (name, pred, err) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}': ${err}`)

  return (tags) => {
    return of(tags)
      .map(parseTags)
      .map(prop('Module'))
      .chain((moduleId) =>
        of(moduleId)
          .chain(fromPromise((moduleId) => Promise.all([
            loadTransactionData(moduleId),
            loadTransactionMeta(moduleId)
          ])))
          /**
           * This CU currently only implements evaluation for emscripten Module-Format,
           * so we check that the Module is the correct Module-Format, and reject if not
           */
          .chain(([data, meta]) =>
            of(meta.tags)
              .map(parseTags)
              .chain(checkTag('Module-Format', eqOrIncludes('emscripten'), 'only \'emscripten\' module format is supported by this CU'))
              .map(() => data)
          )
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

  const getModule = getModuleWith(env)

  return (ctx) => {
    return of(ctx.tags)
      .chain(getModule)
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
      .map(ctx => {
        logger('Loaded source and appended to ctx')
        return ctx
      })
  }
}
