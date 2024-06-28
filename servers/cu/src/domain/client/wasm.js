import { promisify } from 'node:util'
import { PassThrough, Readable, pipeline } from 'node:stream'
import { createGunzip, createGzip } from 'node:zlib'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { join } from 'node:path'

import { always, identity } from 'ramda'
import { LRUCache } from 'lru-cache'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'

import AoLoader from '@permaweb/ao-loader'
import WeaveDrive from '@permaweb/weavedrive'

import { joinUrl } from '../utils.js'
import AsyncLock from 'async-lock'

const pipelineP = promisify(pipeline)

export function wasmResponse (stream) {
  return new Response(stream, { headers: { 'Content-Type': 'application/wasm' } })
}

/**
 * ###################
 * File Utils
 * ###################
 */

function readWasmFileWith ({ DIR }) {
  return async (moduleId) => {
    const file = join(DIR, `${moduleId}.wasm.gz`)

    return new Promise((resolve, reject) =>
      resolve(pipeline(
        createReadStream(file),
        createGunzip(),
        reject
      ))
    )
  }
}

function writeWasmFileWith ({ DIR, logger }) {
  return async (moduleId, wasmStream) => {
    const file = join(DIR, `${moduleId}.wasm.gz`)

    return pipelineP(
      wasmStream,
      createGzip(),
      createWriteStream(file)
    ).catch((err) => {
      logger('Failed to cache binary for module "%s" in a file. Skipping...', moduleId, err)
    })
  }
}

/**
 * #######################
 * Network Utils
 * #######################
 */

function streamTransactionDataWith ({ fetch, ARWEAVE_URL, logger }) {
  return (id) =>
    of(id)
      .chain(fromPromise((id) =>
        fetch(joinUrl({ url: ARWEAVE_URL, path: `/raw/${id}` }))
          .then(async (res) => {
            if (res.ok) return res
            logger('Error Encountered when fetching raw data for transaction \'%s\' from gateway \'%s\'', id)
            throw new Error(`${res.status}: ${await res.text()}`)
          })
      ))
      .toPromise()
}

/**
 * A cache for compiled Wasm Modules
 *
 * @returns {LRUCache<string, WebAssembly.Module>}
 */
export function createWasmModuleCache ({ MAX_SIZE }) {
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
export function createWasmInstanceCache ({ MAX_SIZE }) {
  return new LRUCache({
    /**
       * #######################
       * Capacity Configuration
       * #######################
       */
    max: MAX_SIZE
  })
}

export function addExtensionWith ({ ARWEAVE_URL }) {
  return async ({ extension }) => {
    /**
       * TODO: make this cleaner. Should we attach only api impls
       * or other options (ie. ARWEAVE) as well here?
       */
    if (extension === 'WeaveDrive') return { WeaveDrive, ARWEAVE: ARWEAVE_URL }
    throw new Error(`Extension ${extension} api not found`)
  }
}

export function bootstrapWasmInstanceWith () {
  return (wasmModule, moduleOptions) => {
    return AoLoader(
      (info, receiveInstance) => WebAssembly.instantiate(wasmModule, info).then(receiveInstance),
      moduleOptions
    )
  }
}

export function loadWasmModuleWith ({ fetch, ARWEAVE_URL, WASM_BINARY_FILE_DIRECTORY, logger, cache }) {
  const streamTransactionData = fromPromise(streamTransactionDataWith({ fetch, ARWEAVE_URL, logger }))
  const readWasmFile = fromPromise(readWasmFileWith({ DIR: WASM_BINARY_FILE_DIRECTORY }))
  const writeWasmFile = writeWasmFileWith({ DIR: WASM_BINARY_FILE_DIRECTORY })

  const toWasmResponse = fromPromise((stream) => WebAssembly.compileStreaming(wasmResponse(Readable.toWeb(stream))))

  function maybeCachedModule (args) {
    const { moduleId } = args

    return of(moduleId)
      .map((moduleId) => cache.get(moduleId))
      .chain((wasm) => wasm
        ? Resolved(wasm)
        : Rejected(args)
      )
  }

  function maybeStoredBinary (args) {
    const { moduleId } = args
    logger('Checking for wasm file to load module "%s"...', moduleId)

    return of(moduleId)
      .chain(readWasmFile)
      .chain(toWasmResponse)
      .bimap(always(args), identity)
  }

  function loadTransaction ({ moduleId }) {
    logger('Loading wasm transaction "%s"...', moduleId)

    return of(moduleId)
      .chain(streamTransactionData)
      .map((res) => res.body.tee())
      /**
       * Simoultaneously cache the binary in a file
       * and compile to a WebAssembly.Module
       */
      .chain(fromPromise(([s1, s2]) =>
        Promise.all([
          writeWasmFile(moduleId, Readable.fromWeb(s1)),
          WebAssembly.compileStreaming(wasmResponse(s2))
        ])
      ))
      .map(([, res]) => res)
  }

  const lock = new AsyncLock()

  return ({ moduleId }) => {
    /**
     * Prevent multiple eval streams close together
     * from compiling the wasm module multiple times
     */
    return lock.acquire(moduleId, () =>
      maybeCachedModule({ moduleId })
        .bichain(
          /**
           * Potentially Compile the Wasm Module, cache it for next time,
           *
           * then create the Wasm instance
           */
          () => of({ moduleId })
            .chain(maybeStoredBinary)
            .bichain(loadTransaction, Resolved)
            /**
             * Cache the wasm Module in memory for quick access next time
             */
            .map((wasmModule) => {
              logger('Caching compiled WebAssembly.Module for module "%s" in memory, for next time...', moduleId)
              cache.set(moduleId, wasmModule)
              return wasmModule
            }),
          /**
           * Cached instance, so just reuse
           */
          Resolved
        )
        .toPromise())
  }
}

/**
 * The memory may be encoded, so in order to compute the correct hash
 * of the actual memory, we may need to decode it
 *
 * We use a stream, so that we can incrementally compute hash in a non-blocking way
 */
export async function hashWasmMemory (memoryStream, encoding) {
  /**
   * TODO: add more encoding options
   */
  if (encoding && encoding !== 'gzip') {
    throw new Error('Only GZIP encoding of Memory is supported for Process Checkpoints')
  }

  return Promise.resolve(memoryStream)
    .then((memoryStream) => {
      const hash = createHash('sha256')
      return pipelineP(
        memoryStream,
        encoding === 'gzip'
          ? createGunzip()
          : new PassThrough(),
        hash
      )
        .then(() => hash.digest('hex'))
    })
}

export function isModuleMemoryLimitSupportedWith ({ PROCESS_WASM_MEMORY_MAX_LIMIT }) {
  return async ({ limit }) => {
    return limit <= PROCESS_WASM_MEMORY_MAX_LIMIT
  }
}

export function isModuleComputeLimitSupportedWith ({ PROCESS_WASM_COMPUTE_MAX_LIMIT }) {
  return async ({ limit }) => {
    return limit <= PROCESS_WASM_COMPUTE_MAX_LIMIT
  }
}

export function isModuleFormatSupportedWith ({ PROCESS_WASM_SUPPORTED_FORMATS }) {
  return async ({ format }) => PROCESS_WASM_SUPPORTED_FORMATS.includes(format.trim())
}

export function isModuleExtensionSupportedWith ({ PROCESS_WASM_SUPPORTED_EXTENSIONS }) {
  return async ({ extension }) => PROCESS_WASM_SUPPORTED_EXTENSIONS.includes(extension.trim())
}
