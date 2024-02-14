import { workerData } from 'node:worker_threads'
import { readFile } from 'node:fs'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { gunzip } from 'node:zlib'

import { worker } from 'workerpool'
import { identity } from 'ramda'
import { LRUCache } from 'lru-cache'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import AoLoader from '@permaweb/ao-loader'

import { createLogger } from '../logger.js'

const readFileP = promisify(readFile)
const gunzipP = promisify(gunzip)

/**
 * ###################
 * File Utils
 * ###################
 */

function readWasmFileWith ({ DIR }) {
  return async (moduleId) => {
    return readFileP(join(DIR, `${moduleId}.wasm.gz`))
      .then(gunzipP)
  }
}

/**
 * ##############################
 * #### LRU In-Memory Cache utils
 * ##############################
 */

/**
 * A cache for wasm binaries
 *
 * @returns {LRUCache<string, ArrayBuffer>}
 */
function createWasmBinaryCache ({ MAX_SIZE }) {
  return new LRUCache({
    /**
     * #######################
     * Capacity Configuration
     * #######################
     */
    max: MAX_SIZE
  })
}

/**
 * A cache for loaded wasm modules,
 * as part of evaluating a stream of messages
 *
 * @returns {LRUCache<string, Function>}
 */
function createWasmModuleCache ({ MAX_SIZE }) {
  return new LRUCache({
    /**
     * #######################
     * Capacity Configuration
     * #######################
     */
    max: MAX_SIZE
  })
}

function evaluateWith ({
  wasmModuleCache,
  wasmBinaryCache,
  readWasmFile,
  bootstrapWasmModule,
  logger
}) {
  function maybeCachedWasm ({ streamId, moduleId, limit, Memory, message, AoGlobal }) {
    return of(moduleId)
      .map((moduleId) => wasmBinaryCache.get(moduleId))
      .chain((wasm) => wasm
        ? Resolved(wasm)
        : Rejected({ streamId, moduleId, limit, Memory, message, AoGlobal })
      )
      .chain(fromPromise((wasm) => bootstrapWasmModule(wasm, limit)))
  }

  function storedWasm ({ streamId, moduleId, limit, Memory, message, AoGlobal }) {
    logger('Checking for wasm file to load module "%s"...', moduleId)

    return of(moduleId)
      .chain(fromPromise(readWasmFile))
      .bimap(
        () => ({ streamId, moduleId, limit, Memory, message, AoGlobal }),
        identity
      )
      /**
       * Cache the wasm in memory for quick access
       */
      .map((wasm) => {
        logger('Wasm file for module "%s" was found. Caching in memory for next time...', moduleId)
        wasmBinaryCache.set(moduleId, wasm)
        return wasm
      })
      .chain(fromPromise(async (wasm) => bootstrapWasmModule(wasm, limit)))
  }

  function loadModule ({ streamId, moduleId, limit, Memory, message, AoGlobal }) {
    return maybeCachedWasm({ streamId, moduleId, limit, Memory, message, AoGlobal })
      .bichain(storedWasm, Resolved)
      /**
       * Cache the wasm module for this particular stream,
       * in memory, for quick retrieval next time
       */
      .map((wasmModule) => {
        wasmModuleCache.set(streamId, wasmModule)
        return wasmModule
      })
  }

  function maybeCachedModule ({ streamId, moduleId, limit, Memory, message, AoGlobal }) {
    return of(streamId)
      .map((streamId) => wasmModuleCache.get(streamId))
      .chain((wasmModule) => wasmModule
        ? Resolved(wasmModule)
        : Rejected({ streamId, moduleId, limit, Memory, message, AoGlobal })
      )
  }

  return ({ streamId, moduleId, limit, name, processId, Memory, message, AoGlobal }) =>
    /**
     * Dynamically load the module, either from cache,
     * or from a file
     */
    maybeCachedModule({ streamId, moduleId, limit, name, processId, Memory, message, AoGlobal })
      .bichain(loadModule, Resolved)
      /**
       * Perform the evaluation
       */
      .chain((wasmModule) =>
        of(wasmModule)
          .map((wasmModule) => {
            logger('Evaluating message "%s" to process "%s"', name, processId)
            return wasmModule
          })
          .chain(fromPromise(async (wasmModule) => wasmModule(Memory, message, AoGlobal)))
          .bimap(identity, identity)
      )
      .toPromise()
}

/**
 * Expose our worker api
 */
worker({
  evaluate: evaluateWith({
    wasmBinaryCache: createWasmBinaryCache({ MAX_SIZE: workerData.WASM_BINARY_CACHE_MAX_SIZE }),
    wasmModuleCache: createWasmModuleCache({ MAX_SIZE: workerData.WASM_MODULE_CACHE_MAX_SIZE }),
    readWasmFile: readWasmFileWith({ DIR: workerData.WASM_BINARY_FILE_DIRECTORY }),
    bootstrapWasmModule: AoLoader,
    logger: createLogger(`ao-cu:worker-${workerData.id}`)
  })
})
