import { fromPromise, of, Resolved, Rejected } from 'hyper-async'
import { always, identity, mergeRight, prop } from 'ramda'
import { z } from 'zod'

import { findModuleSchema, loadTransactionMetaSchema, saveModuleSchema } from '../dal.js'
import { eqOrIncludes, parseTags } from '../utils.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  moduleId: z.string().refine((val) => !!val, {
    message: 'process moduleId must be attached to context'
  })
}).passthrough()

function getModuleWith ({ findModule, saveModule, loadTransactionMeta, logger }) {
  loadTransactionMeta = fromPromise(loadTransactionMetaSchema.implement(loadTransactionMeta))
  findModule = fromPromise(findModuleSchema.implement(findModule))
  saveModule = fromPromise(saveModuleSchema.implement(saveModule))

  const checkTag = (name, pred, err) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}': ${err}`)

  function loadFromGateway (moduleId) {
    logger.tap('Could not find module in db. Loading from gateway...')

    return of(moduleId)
      .chain(loadTransactionMeta)
      /**
       * This CU currently only implements evaluation for emscripten Module-Format,
       * so we check that the Module is the correct Module-Format, and reject if not
       */
      .chain((meta) =>
        of(meta.tags)
          .map(parseTags)
          .chain(checkTag('Module-Format', eqOrIncludes('wasm32-unknown-emscripten'), 'only \'wasm32-unknown-emscripten\' module format is supported by this CU'))
          .map(() => ({ id: moduleId, tags: meta.tags }))
      )
      .chain((module) =>
        saveModule(module)
          .bimap(
            logger.tap('Could not save module to db. Nooping'),
            logger.tap('Saved module')
          )
          .bichain(
            always(Resolved(module)),
            always(Resolved(module))
          )
      )
  }

  function maybeFindModule (moduleId) {
    return findModule({ moduleId })
      /**
       * The module could indeed not be found, or there was some other error
       * fetching from persistence. Regardless, we will fallback to loading from
       * the gateway
       */
      .bimap(() => moduleId, identity)
  }

  return (tags) => {
    return of(tags)
      .map(parseTags)
      .map(prop('Module'))
      .chain((moduleId) =>
        of(moduleId)
          .chain(maybeFindModule)
          .bichain(loadFromGateway, Resolved)
          .map((module) => ({ moduleId: module.id }))
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
  }
}
