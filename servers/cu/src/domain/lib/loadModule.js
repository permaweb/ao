import { fromPromise, of, Resolved, Rejected } from 'hyper-async'
import { __, always, applySpec, assoc, defaultTo, identity, isNotNil, mergeRight, path, pathOr, pipe, prop } from 'ramda'
import { z } from 'zod'
import bytes from 'bytes'

import { findModuleSchema, loadTransactionMetaSchema, saveModuleSchema } from '../dal.js'
import { parseTags } from '../utils.js'
import { rawTagSchema } from '../model.js'

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
    extensions: z.record(z.array(rawTagSchema))
    /**
     * passthrough so other options required by extensions
     * can flow through
     *
     * TODO: maybe type?
     */
  }).passthrough(),
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

function setModuleOptionsWith ({ isModuleMemoryLimitSupported, isModuleComputeLimitSupported, isModuleFormatSupported, isModuleExtensionSupported }) {
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
        path(['moduleTags', 'Extension']),
        defaultTo([]),
        /**
         * Depending on how many extensions there are,
         * we need to map such that it is always an array
         */
        (extensions) => Array.isArray(extensions)
          ? extensions
          : [extensions],
        /**
         * { [extensionName]: Tag[] }
         */
        (extensions) => extensions.reduce(
          (acc, extension) => {
            acc[extension] = ctx.moduleTags
              // { name: 'Foo:bar', value: '...' }[]
              .filter((t) => t.name.startsWith(extension))
              /**
               * Strip the extension namespace off of each tag
               * in the namespace:
               *
               * { name: 'Foo-Max', value: '5' } => { name: 'Max', value: '5' }
               *
               * Since we also need to strip the ':', we can simply
               * omit making the indexStart 0-based (by just omitting subtracting 1)
               */
              .map((t) => ({ name: t.name.substring(extension.length + 1), value: t.value }))
            return acc
          },
          {}
        )
      ),
      spawn: () => ({ id: ctx.id, owner: ctx.owner, tags: ctx.tags }),
      module: () => ({ id: ctx.moduleId, owner: ctx.moduleOwner, tags: ctx.moduleTags }),
      /**
       * Hardcoding mode, admissableList and blockHeight for
       * llama
       */
      mode: (args) => 'test',
      admissableList: () => [
        'dx3GrOQPV5Mwc1c-4HTsyq0s1TNugMf7XfIKJkyVQt8', // Random NFT metadata (1.7kb of JSON)
        'XOJ8FBxa6sGLwChnxhF2L71WkKLSKq1aU5Yn5WnFLrY', // GPT-2 117M model.
        'M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc', // GPT-2-XL 4-bit quantized model.
        'kd34P4974oqZf2Db-hFTUiCipsU6CzbR6t-iJoQhKIo', // Phi-2
        'ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo', // Phi-3 Mini 4k Instruct
        'sKqjvBbhqKvgzZT4ojP1FNvt4r_30cqjuIIQIr-3088', // CodeQwen 1.5 7B Chat q3
        'Pr2YVrxd7VwNdg6ekC0NXWNKXxJbfTlHhhlrKbAd1dA', // Llama3 8B Instruct q4
        'jbx-H6aq7b3BbNCHlK50Jz9L-6pz9qmldrYXMwjqQVI' // Llama3 8B Instruct q8
      ],
      blockHeight: () => 100
    }))
    .chain(checkModuleOption(
      'inputEncoding',
      isNotNil,
      { status: 422, message: `Input-Encoding for module "${ctx.moduleId}" is not supported` }
    ))
    .chain(checkModuleOption(
      'outputEncoding',
      isNotNil,
      { status: 422, message: `Output-Encoding for module "${ctx.moduleId}" is not supported` }
    ))
    .chain(checkModuleOption(
      'format',
      (format) => isModuleFormatSupported({ format }),
      { status: 422, message: `Module-Format for module "${ctx.moduleId}" is not supported` }
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
    .chain(checkModuleOption(
      'extensions',
      (extensions) => Promise.all(
        Object.keys(extensions).map((extension) => isModuleExtensionSupported({ extension }))
      )
        .then((res) => res.filter((isSupported) => !isSupported))
        .then((unsupported) => !unsupported.length),
      { status: 422, message: `Module Extensions for module "${ctx.moduleId}" are not supported` }
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
