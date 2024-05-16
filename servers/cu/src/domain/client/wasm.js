import { promisify } from 'node:util'
import { PassThrough, pipeline } from 'node:stream'
import { createGunzip } from 'node:zlib'
import { createHash } from 'node:crypto'

const pipelineP = promisify(pipeline)

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
