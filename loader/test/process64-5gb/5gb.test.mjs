
import * as assert from 'node:assert'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import { default as AoLoader } from '../../src/index.cjs'

const format = 'wasm64-unknown-emscripten'

const processId = 'this-process'

const msgWith = ({ data = '', tags = {} } = {}) => ({
  Target: processId,
  Tags: Object.entries(tags).map(([name, value]) => ({ name, value})),
  Data: data,
})

const env = {
  Process: {
    Id: processId,
    Tags: [],
  },
}

describe(`@permaweb/ao-loader ${format}`, async () => {
  const wasmBinary = await readFile('process.wasm')

  it('grows the memory before a handle()', async () => {
    const handle = await AoLoader(wasmBinary, { format })

    const msg1 = msgWith()
    const result1 = handle(null, msg1, env)
    assert.equal(result1.Memory.length, 20971520)

    const newBuffer = new ArrayBuffer(5_000_000_000)
    const newMemory = new Uint8Array(newBuffer, 0, 5_000_000_000)
    newMemory.set(result1.Memory, 0)

    const data = randomBytes(16).toString('hex')
    const msg2 = msgWith({
      tags: {
        Action: 'Insert-Into-Table',
        Times: '1'
      },
      data,
    })
    const result2 = handle(newMemory, msg2, env)
    assert.notEqual(result1.Memory.length, result2.Memory.length)
  })

  it('grows the memory during a handle()', async () => {
    const handle = await AoLoader(wasmBinary, { format })

    const times = 20

    const msg1 = msgWith()
    const result1 = handle(null, msg1, env)
    assert.equal(result1.Memory.length, 20971520)

    const data = randomBytes(524_228).toString('hex')
    const msg2 = msgWith({
      tags: {
        Action: 'Insert-Into-Table',
        Times: times.toString()
      },
      data,
    })
    const result2 = handle(result1.Memory, msg2, env)
    assert.notEqual(result1.Memory.length, result2.Memory.length)

    const msg3 = msgWith({ tags: { Action: 'Get-Table-Length' } })
    const result3 = handle(result2.Memory, msg3, env)
    assert.equal(result3.Output, times)
  })

  const targetSizeInBytes = 5_368_709_120 // 5 GiB
  it(`grows the memory past ${targetSizeInBytes} bytes`, async () => {
    const handle = await AoLoader(wasmBinary, { format })

    // get 512 KiB
    const bytes = randomBytes(524_228)

    // inserting 1 MiB 5,120 times is at least 5GiB of data
    const msg = msgWith({
      tags: {
        Action: 'Insert-Into-Table',
        Times: '5120', // 5 KiB times
      },
      data: bytes.toString('hex'), // this string is 1 MiB (hex encoding is 2 bytes per byte)
    })
    const result = handle(null, msg, env)
    assert.ok(result.Memory.byteLength >= targetSizeInBytes, `The memory is less than ${targetSizeInBytes} bytes!`)
  })
})
