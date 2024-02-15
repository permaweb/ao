import { fromPromise, of, Resolved, Rejected } from 'hyper-async'
import { __, always, assoc, identity, mergeRight, prop } from 'ramda'
import { z } from 'zod'

import { findModuleSchema, loadTransactionMetaSchema, saveModuleSchema } from '../dal.js'
import { eqOrIncludes, findRawTag, parseTags } from '../utils.js'
import { positiveIntSchema, rawTagSchema } from '../model.js'

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
  }),
  moduleTags: z.array(rawTagSchema),
  moduleOwner: z.string().min(1),
  moduleComputeLimit: positiveIntSchema,
  moduleMemoryLimit: positiveIntSchema
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
          .map(() => ({
            id: moduleId,
            tags: meta.tags,
            owner: meta.owner.address
          }))
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
          .map((module) => ({ moduleId: module.id, moduleTags: module.tags, moduleOwner: module.owner }))
      )
  }
}

function setModuleLimitsWith ({ doesExceedModuleMaxMemory, doesExceedModuleMaxCompute }) {
  function maybeTagLimit ({ name, tags }) {
    return of(tags)
      .map((tags) => findRawTag(name, tags))
      .chain((tag) => tag ? Resolved(positiveIntSchema.parse(tag.value)) : Rejected({ name, tags }))
  }

  function checkAndSetLimit (name, field, pred, msg) {
    return (ctx) => of({ name, tags: ctx.tags })
      .chain(maybeTagLimit)
      .bichain(
        () => maybeTagLimit({ name, tags: ctx.moduleTags }),
        Resolved
      )
      .chain((limit) =>
        of({ amount: limit })
          .chain(fromPromise(pred))
          .chain((fail) => {
            if (fail) return Rejected()
            return Resolved(limit)
          })
      )
      .bimap(always(msg), assoc(field, __, ctx))
  }

  return (ctx) => of(ctx)
    .chain(checkAndSetLimit(
      'Compute-Limit',
      'moduleComputeLimit',
      doesExceedModuleMaxCompute,
      { status: 413, message: `Compute-Limit for process "${ctx.id}" exceeds supported limit` }
    ))
    .chain(checkAndSetLimit(
      'Memory-Limit',
      'moduleMemoryLimit',
      doesExceedModuleMaxMemory,
      { status: 413, message: `Memory-Limit for process "${ctx.id}" exceeds supported limit` }
    ))
    .map(mergeRight(ctx))
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
  const setModuleLimits = setModuleLimitsWith(env)

  return (ctx) => {
    return of(ctx.tags)
      .chain(getModule)
      .map(mergeRight(ctx))
      .chain(setModuleLimits)
      .map(ctxSchema.parse)
  }
}
