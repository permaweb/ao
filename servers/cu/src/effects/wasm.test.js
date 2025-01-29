/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { createReadStream, readFileSync } from 'node:fs'
import { createGzip } from 'node:zlib'
import { Readable } from 'node:stream'
import { randomBytes } from 'node:crypto'

import { compressWasmMemoryWith, hashWasmMemoryWith } from './wasm.js'
import { createTestLogger } from '../domain/logger.js'

const logger = createTestLogger({ name: 'ao-cu:ao-process' })

describe('wasm', () => {
  describe('compressWasmMemory', () => {
    test('should compress the wasm memory', async () => {
      const compressWasmMemory = compressWasmMemoryWith()
      const start = Readable.from(randomBytes(2 * 1024 * 1024))

      const compressed = await compressWasmMemory(start, 'gzip')

      assert.ok(compressed.length < start.length)
      // assert.equal(start.equals(decompressWasmMemoryWith()(compressed, 'gzip')))
    })

    // test('should passthrough the wasm memory', async () => {
    //   const start = Buffer.allocUnsafe(2 * 1024 * 1024)
    //   start.fill(0)

    //   const passthrough = await compressWasmMemoryWith()(start)

    //   assert.ok(passthrough.length === start.length)
    //   assert.equal(start.equals(passthrough))
    // })
  })

  describe('hashWasmMemory', () => {
    const hashWasmMemory = hashWasmMemoryWith({ logger })

    test('should hash the array buffer', async () => {
      const s = createReadStream('./test/processes/happy/process.wasm')

      const sha = await hashWasmMemory(s)

      assert.ok(typeof sha === 'string')
      assert.equal(sha.length, 64)
    })

    test('should hash the array buffer derived from a typed array', async () => {
      const s = createReadStream('./test/processes/happy/process.wasm')
      const sha = await hashWasmMemory(s)

      const tArray = new Uint8Array(readFileSync('./test/processes/happy/process.wasm'))
      const fromTArray = Buffer.from(tArray.buffer, tArray.byteOffset, tArray.byteLength)
      const fromBuffer = await hashWasmMemory(Readable.from(fromTArray))

      assert.equal(fromBuffer, sha)
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

    test('should hash large data', async () => {
      function generate2GBBufferStream () {
        const buffer = Buffer.allocUnsafe(2 * 1024 * 1024 * 1024)
        buffer.fill(0)

        return Readable.from(buffer)
      }

      const s = generate2GBBufferStream()
      const sha = await hashWasmMemory(s)

      assert.ok(typeof sha === 'string')
      assert.equal(sha.length, 64)
    })
  })
})
