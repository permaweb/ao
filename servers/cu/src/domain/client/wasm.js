import { tmpdir } from 'node:os'
import { createWriteStream, readFile } from 'node:fs'
import { promisify } from 'node:util'
import { pipeline } from 'node:stream'
import { join } from 'node:path'
import { createGzip, gunzip } from 'node:zlib'

const readFileP = promisify(readFile)
const gunzipP = promisify(gunzip)
const pipelineP = promisify(pipeline)

export async function readWasmFile (moduleId) {
  return readFileP(join(tmpdir(), `${moduleId}.wasm.gz`))
    .then(gunzipP)
}

export async function writeWasmFile (moduleId, wasmStream) {
  return pipelineP(
    wasmStream,
    createGzip(),
    createWriteStream(join(tmpdir(), `${moduleId}.wasm.gz`))
  )
}

export function doesExceedMaximumHeapSizeWith ({ PROCESS_WASM_HEAP_MAX_SIZE }) {
  /**
   * This is simple right now, but could be more complex later, so wrapping
   * as a side-effect will be better for long term
   *
   * For now, heap is simple array buffer
   */
  return async ({ heap }) => heap.byteLength > PROCESS_WASM_HEAP_MAX_SIZE
}
