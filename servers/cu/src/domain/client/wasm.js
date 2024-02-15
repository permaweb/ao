import { tmpdir } from 'node:os'
import { createWriteStream, stat } from 'node:fs'
import { promisify } from 'node:util'
import { PassThrough, pipeline } from 'node:stream'
import { join } from 'node:path'
import { createGzip, createGunzip } from 'node:zlib'
import { createHash } from 'node:crypto'

const statP = promisify(stat)
const pipelineP = promisify(pipeline)

export async function wasmFileExists (moduleId) {
  return statP(join(tmpdir(), `${moduleId}.wasm.gz`))
}

export async function writeWasmFile (moduleId, wasmStream) {
  return pipelineP(
    wasmStream,
    createGzip(),
    createWriteStream(join(tmpdir(), `${moduleId}.wasm.gz`))
  )
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

export function doesExceedModuleMaxMemoryWith ({ PROCESS_WASM_MEMORY_MAX_LIMIT }) {
  return async ({ limit }) => limit > PROCESS_WASM_MEMORY_MAX_LIMIT
}

export function doesExceedModuleMaxComputeWith ({ PROCESS_WASM_COMPUTE_MAX_LIMIT }) {
  return async ({ limit }) => limit > PROCESS_WASM_COMPUTE_MAX_LIMIT
}
