import { promisify } from 'node:util'
import { PassThrough, Readable, Transform, pipeline } from 'node:stream'
import { createGunzip, createGzip } from 'node:zlib'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { join } from 'node:path'

import { always, identity } from 'ramda'
import { LRUCache } from 'lru-cache'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'

import AoLoader from '@permaweb/ao-loader'
import WeaveDrive from '@permaweb/weavedrive'

import { joinUrl } from '../domain/utils.js'
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

export function addExtensionWith ({ ARWEAVE_URL, GRAPHQL_URL, CHECKPOINT_GRAPHQL_URL }) {
  /**
   * WeaveDrive supports passing multiple urls to use for arweave and gateway
   * related operations, within the extension.
   *
   * NOTE: WeaveDrive doesn't distinguish between a host for the Arweave HTTP API
   * and a host for the Arweave GraphQL gateway api (it conflates the two). So certain
   * operations will always fail for certain hosts ie. Arweave HTTP API operations sent to a host
   * that only hosts the GraphQL gateway api. Until WeaveDrive allows passing distinct urls
   * for each use case, passing a _first_ host that implements both is the best we can do to mitigate.
   */
  const weaveDriveUrls = Array.from(
    /**
     * dedupe in the case that the CU is configured to use the same host for multiple
     * use-cases. This prevents WeaveDrive from falling back to the same url, and dictating
     * its own retry mechanisms
     */
    new Set([ARWEAVE_URL, GRAPHQL_URL, CHECKPOINT_GRAPHQL_URL].map(s => new URL(s).origin))
  ).join(',')

  return async ({ extension }) => {
    /**
     * TODO: make this cleaner. Should we attach only api impls
     * or other options (ie. ARWEAVE) as well here?
     */
    if (extension === 'WeaveDrive') return { WeaveDrive, ARWEAVE: weaveDriveUrls }
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

  const toWasmResponse = (moduleOptions) => fromPromise((stream) => WebAssembly.compileStreaming(wasmResponse(Readable.toWeb(stream), moduleOptions)))

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
    const { moduleId, moduleOptions } = args
    logger('Checking for wasm file to load module "%s"...', moduleId)

    return of(moduleId)
      .chain(readWasmFile)
      .chain(toWasmResponse(moduleOptions))
      .bimap(always(args), identity)
  }

  function loadTransaction ({ moduleId, moduleOptions }) {
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
          WebAssembly.compileStreaming(wasmResponse(s2), moduleOptions)
        ])
      ))
      .map(([, res]) => res)
  }

  const lock = new AsyncLock()

  return ({ moduleId, moduleOptions }) => {
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
          () => of({ moduleId, moduleOptions })
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
export function hashWasmMemoryWith () {
  class SubchunkStream extends Transform {
    constructor (chunkSize) {
      super()
      this.chunkSize = chunkSize
      /**
       * accumulate received chunks into this buffer.
       *
       * It will be subchunked as needed, as the transform stream
       * is read.
       */
      this.buffer = Buffer.alloc(0)
    }

    _transform (chunk, _encoding, callback) {
      this.buffer = Buffer.concat([this.buffer, chunk])

      while (this.buffer.length >= this.chunkSize) {
        const subChunk = this.buffer.subarray(0, this.chunkSize)
        this.buffer = this.buffer.subarray(this.chunkSize)

        /**
         * We stop if push returns false in order to respect
         * backpressure
         */
        if (!this.push(subChunk)) return
      }

      callback()
    }

    _flush (callback) {
      if (this.buffer.length > 0) this.push(this.buffer)
      callback()
    }
  }

  return async (memoryStream, encoding) => {
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
          /**
           * The memoryStream, if derived from an iterable like a Buffer,
           * may emit the entire data stream as a single chunk.
           *
           * This can break things like Crypto hash, which can only handle
           * data chunks less than 2GB.
           *
           * So we use this Transform stream to receive chunks,
           * then re-emit "sub-chunks" of the given size -- in this case
           * the default highWaterMark of 64kb
           *
           * This allows for hashing to work for any size memory, derived
           * from any iterable, while respecting backpressure
           */
          new SubchunkStream(1024 * 64),
          encoding === 'gzip'
            ? createGunzip()
            : new PassThrough(),
          hash
        )
          .then(() => hash.digest('hex'))
      })
  }
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
