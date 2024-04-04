import { fromPromise, of, Resolved, Rejected } from 'hyper-async'
import { __, always, applySpec, assoc, defaultTo, identity, isNotNil, mergeRight, path, pathOr, pipe, prop } from 'ramda'
import { z } from 'zod'
import bytes from 'bytes'

import { findModuleSchema, loadTransactionMetaSchema, saveModuleSchema } from '../dal.js'
import { parseTags } from '../utils.js'
import { commaDelimitedArraySchema, rawTagSchema } from '../model.js'

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
  moduleOptions: z.object({
    format: z.string().min(1),
    inputEncoding: z.string().min(1),
    outputEncoding: z.string().min(1),
    memoryLimit: z.number().nonnegative(),
    computeLimit: z.number().nonnegative(),
    extensions: z.array(z.string())
  }),
  moduleTags: z.array(rawTagSchema),
  moduleOwner: z.string().min(1)
}).passthrough()

function getModuleWith ({ findModule, saveModule, loadTransactionMeta, logger }) {
  loadTransactionMeta = fromPromise(loadTransactionMetaSchema.implement(loadTransactionMeta))
  findModule = fromPromise(findModuleSchema.implement(findModule))
  saveModule = fromPromise(saveModuleSchema.implement(saveModule))

  function loadFromGateway (moduleId) {
    logger.tap('Could not find module in db. Loading from gateway...')

    return of(moduleId)
      .chain(loadTransactionMeta)
      .map((meta) => ({
        id: moduleId,
        tags: meta.tags,
        owner: meta.owner.address
      }))
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

  return (ctx) => {
    return of(ctx.tags)
      .map(parseTags)
      .map(prop('Module'))
      .chain((moduleId) =>
        of(moduleId)
          .chain(maybeFindModule)
          .bichain(loadFromGateway, Resolved)
          .map((module) => ({ moduleId: module.id, moduleTags: module.tags, moduleOwner: module.owner }))
          .map(mergeRight(ctx))
      )
  }
}

function setModuleOptionsWith ({ isModuleMemoryLimitSupported, isModuleComputeLimitSupported, isModuleFormatSupported }) {
  const checkModuleOption = (name, pred, err) => (options) =>
    of()
      .chain(fromPromise(async () => pred(options[name])))
      .chain((b) => b
        ? Resolved(options)
        : Rejected(err)
      )

  return (ctx) => of(ctx)
    .map((ctx) => ({ processTags: parseTags(ctx.tags), moduleTags: parseTags(ctx.moduleTags) }))
    .map(applySpec({
      format: path(['moduleTags', 'Module-Format']),
      inputEncoding: path(['moduleTags', 'Input-Encoding']),
      outputEncoding: path(['moduleTags', 'Output-Encoding']),
      memoryLimit: pipe(
        (args) => pathOr(
          path(['moduleTags', 'Memory-Limit'], args),
          ['processTags', 'Memory-Limit'],
          args
        ),
        (val) => {
          if (!val) return
          return bytes.parse(val.replace('-', ''))
        }
      ),
      computeLimit: pipe(
        (args) => pathOr(
          path(['moduleTags', 'Compute-Limit'], args),
          ['processTags', 'Compute-Limit'],
          args
        ),
        (val) => {
          if (!val) return
          return parseInt(val)
        }
      ),
      extensions: pipe(
        path(['moduleTags', 'extensions']),
        defaultTo([]),
        /**
         * Spec currently doesn't define the shape of extensions,
         * so assuming that it is a comma delimited string
         */
        (val) => commaDelimitedArraySchema.parse(val)
      )
    }))
    .chain(checkModuleOption(
      'inputEncoding',
      isNotNil,
      { status: 413, message: `Input-Encoding for module "${ctx.moduleId}" is not supported` }
    ))
    .chain(checkModuleOption(
      'outputEncoding',
      isNotNil,
      { status: 413, message: `Output-Encoding for module "${ctx.moduleId}" is not supported` }
    ))
    .chain(checkModuleOption(
      'format',
      (format) => isModuleFormatSupported({ format }),
      { status: 413, message: `Module-Format for module "${ctx.moduleId}" is not supported` }
    ))
    .chain(checkModuleOption(
      'memoryLimit',
      (limit) => {
        if (!limit) return false
        return isModuleMemoryLimitSupported({ limit })
      },
      { status: 413, message: `Memory-Limit for process "${ctx.id}" exceeds supported limit` }
    ))
    .chain(checkModuleOption(
      'computeLimit',
      (limit) => {
        if (!limit) return false
        return isModuleComputeLimitSupported({ limit })
      },
      { status: 413, message: `Compute-Limit for process "${ctx.id}" exceeds supported limit` }
    ))
    .map(assoc('moduleOptions', __, ctx))
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
  const setModuleOptions = setModuleOptionsWith(env)

  return (ctx) => {
    return of(ctx)
      .chain(getModule)
      .chain(setModuleOptions)
      .map(ctxSchema.parse)
  }
}
