import { Readable } from 'node:stream'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, identity, prop } from 'ramda'
import { z } from 'zod'
import { LRUCache } from 'lru-cache'

import { moduleSchema } from '../model.js'

/**
 * @type {LRUCache<string, Function>}
 *
 * @typedef Evaluation
 * @prop {string} [messageId]
 * @prop {string} timestamp
 * @prop {string} ordinate
 * @prop {number} blockHeight
 * @prop {string} [cron]
 */
let wasmModuleCache
export async function createWasmModuleCache ({ MAX_SIZE }) {
  if (wasmModuleCache) return wasmModuleCache

  wasmModuleCache = new LRUCache({
    /**
     * #######################
     * Capacity Configuration
     * #######################
     */
    max: MAX_SIZE
  })

  return wasmModuleCache
}

const moduleDocSchema = z.object({
  _id: z.string().min(1),
  moduleId: moduleSchema.shape.id,
  tags: moduleSchema.shape.tags,
  type: z.literal('module')
})

function createModuleId ({ moduleId }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `module-${moduleId}`
}

export function saveModuleWith ({ pouchDb, logger: _logger }) {
  const logger = _logger.child('ao-module:saveModule')
  const saveModuleInputSchema = z.object({
    _id: z.string().min(1),
    moduleId: moduleDocSchema.shape.moduleId,
    tags: moduleDocSchema.shape.tags,
    type: z.literal('module')
  })

  return (module) => {
    return of(module)
      .chain(fromPromise(async (module) =>
        applySpec({
          _id: (module) => createModuleId({ moduleId: module.id }),
          moduleId: prop('id'),
          tags: prop('tags'),
          type: always('module')
        })(module)
      ))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(saveModuleInputSchema.parse)
      .map((moduleDoc) => {
        logger('Creating module doc for module "%s"', module.id)
        return moduleDoc
      })
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => pouchDb.put(doc)))
          .bichain(
            (err) => {
              /**
               * Already exists, so just return the doc
               */
              if (err.status === 409) return Resolved(doc)
              return Rejected(err)
            },
            Resolved
          )
          .map(always(doc._id))
      )
      .toPromise()
  }
}

export function findModuleWith ({ pouchDb }) {
  return ({ moduleId }) => {
    return of({ moduleId })
      .chain(fromPromise(() => pouchDb.get(createModuleId({ moduleId }))))
      .bichain(
        (err) => {
          if (err.status === 404) return Rejected({ status: 404, message: 'Module not found' })
          return Rejected(err)
        },
        (found) => of(found)
          /**
           * Ensure the input matches the expected
           * shape
           */
          .map(moduleDocSchema.parse)
          .map(applySpec({
            id: prop('moduleId'),
            tags: prop('tags')
          }))
      )
      .toPromise()
  }
}

/**
 * Evaluate a message using the Module with the provided transaciton id.
 *
 * If not already bootstrapped and cached in memory, attempt to load the raw wasm from a file
 * and bootstrap, setting it in the in-memory cache.
 *
 * If not raw wasm isn't cached in a file, then fetch from arweave, cache in a file, bootstrap,
 * and set in the in-memory cache
 *
 * Finally, it evaluates the message and returns the result of the evaluation.
 *
 * TODO: this is encapsulated, such that we can later make this utilize
 * worker threads. We will make that change later
 */
export function evaluateWith ({
  cache = wasmModuleCache,
  loadTransactionData,
  bootstrapWasmModule,
  readWasmFile,
  writeWasmFile,
  logger: _logger
}) {
  const logger = _logger.child('ao-module:evaluate')
  loadTransactionData = fromPromise(loadTransactionData)
  readWasmFile = fromPromise(readWasmFile)

  function maybeCached ({ moduleId, limit }) {
    return of(moduleId)
      .map((moduleId) => cache.get(moduleId))
      .chain((wasmModule) => wasmModule
        ? Resolved(wasmModule)
        : Rejected({ moduleId, limit })
      )
  }

  function maybeStored ({ moduleId, limit }) {
    logger('Wasm module "%s" not cached in memory. Checking for wasm file to load...', moduleId)

    return of(moduleId)
      .chain(readWasmFile)
      .bimap(
        () => ({ moduleId, limit }),
        identity
      )
      .chain(fromPromise((wasm) => bootstrapWasmModule(wasm, limit)))
      /**
       * Cache the bootstrapped wasm module in memory for quick access
       */
      .map((wasmModule) => {
        logger('Wasm file for module "%s" was found. Caching in memory for next time...', moduleId)
        cache.set(moduleId, wasmModule)
        return wasmModule
      })
  }

  function loadFromArweave ({ moduleId, limit }) {
    return of(moduleId)
      .chain(loadTransactionData)
      /**
       * https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/tee
       *
       * Tee the ReadableStream so that we can write it to a file and bootstrap
       * the wasm module in parallel
       */
      .map((res) => res.body.tee())
      .chain(fromPromise(([wasmStreamA, wasmStreamB]) =>
        Promise.all([
          /**
           * Write the module wasm to a file for so that there's less chance it needs
           * to be loaded from Arweave, if it the wasm module doesn't already exist in
           * Memory
           */
          writeWasmFile(moduleId, Readable.fromWeb(wasmStreamA)),
          /**
           * Simoultaneously bootstrap the wasm module
           */
          new Response(wasmStreamB)
            .arrayBuffer()
            .then(wasm => bootstrapWasmModule(wasm, limit))
        ]).then(([, wasmModule]) => wasmModule)
      ))
      /**
       * Cache the bootstrapped wasm module in memory for quick access
       */
      .map((wasmModule) => {
        logger('Raw Wasm file for module "%s" was loaded from Arweave. Caching in file and in memory for next time...', moduleId)
        cache.set(moduleId, wasmModule)
        return wasmModule
      })
  }

  return ({ moduleId, limit, Memory, message, AoGlobal }) => of({ moduleId, limit })
    .chain(maybeCached)
    .bichain(maybeStored, Resolved)
    .bichain(loadFromArweave, Resolved)
    /**
     * Evaluate the message
     */
    .chain(fromPromise(async (wasmModule) => wasmModule(Memory, message, AoGlobal)))
    .toPromise()
}
