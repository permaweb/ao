/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { createReadStream } from 'node:fs'

import { doesExceedMaximumHeapSizeSchema } from '../dal.js'
import { doesExceedMaximumHeapSizeWith, hashWasmMemory } from './wasm.js'
import { createGzip } from 'node:zlib'

describe('wasm', () => {
  describe('doesExceedMaximumHeapSize', () => {
    test('returns whether the heap size exceeds the max', async () => {
      const doesExceedMaximumHeapSize = doesExceedMaximumHeapSizeSchema.implement(
        doesExceedMaximumHeapSizeWith({
          PROCESS_WASM_HEAP_MAX_SIZE: 10
        })
      )

      const tenChars = '1234567890'

      assert.equal(
        await doesExceedMaximumHeapSize({ heap: Buffer.from(tenChars, 'utf-8') }),
        false
      )
      assert.equal(
        await doesExceedMaximumHeapSize({ heap: Buffer.from(tenChars + '1', 'utf-8') }),
        true
      )
    })
  })

  describe('hashWasmMemory', () => {
    test('should hash the array buffer', async () => {
      const s = createReadStream('./test/processes/happy/process.wasm')

      const sha = await hashWasmMemory(s)

      assert.ok(typeof sha === 'string')
      assert.equal(sha.length, 64)
    })

    test('should decode the array buffer before hashing', async () => {
      const raw = createReadStream('./test/processes/happy/process.wasm')
      const rawSha = await hashWasmMemory(raw)

      const encoded = createReadStream('./test/processes/happy/process.wasm')
        .pipe(createGzip())

      const encodedSha = await hashWasmMemory(encoded, 'gzip')

      assert.equal(encodedSha.length, 64)
      assert.equal(rawSha, encodedSha)
    })
  })
})
