/* eslint-disable no-prototype-builtins */

import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import fs from 'fs'
import { Readable } from 'node:stream'
import { createReadStream } from 'node:fs'

/**
 * dynamic import, so we can run unit tests against the source
 * and integration tests against the bundled distribution
 */
const MODULE_PATH = process.env.MODULE_PATH || '../src/index.cjs'

console.log(`${MODULE_PATH}`)

const { default: AoLoader } = await import(MODULE_PATH)
const wasmBinary = fs.readFileSync('./test/process64/process.wasm')

describe('loader', async () => {
  it('load wasm and evaluate message', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten' })
    const mainResult = await handle(null,
      {
        Owner: 'tom',
        Target: 'FOO',
        Tags: [
          { name: 'Action', value: 'echo' }
        ],
        Data: 'Hello World'
      },
      {
        Process: { Id: 'ctr-id-456', Tags: [] }
      }
    )

    assert.ok(mainResult.Memory)
    assert.ok(mainResult.hasOwnProperty('Messages'))
    assert.ok(mainResult.hasOwnProperty('Spawns'))
    assert.ok(mainResult.hasOwnProperty('Error'))
    assert.equal(mainResult.Output, 'Hello World')
    // assert.equal(mainResult.GasUsed, 463918939)
    assert.ok(true)
  })

  it('should use separately instantiated WebAssembly.Instance', async () => {
    /**
     * Non-blocking!
     */
    const wasmModuleP = WebAssembly.compileStreaming(
      /**
       * Could just be a fetch call result, but demonstrating
       * that any Response will do
       */
      new Response(
        Readable.toWeb(createReadStream('./test/process/process.wasm')),
        { headers: { 'Content-Type': 'application/wasm' } }
      )
    )

    const handle = await AoLoader((info, receiveInstance) => {
      assert.ok(info)
      assert.ok(receiveInstance)
      wasmModuleP
        /**
         * Non-Blocking
         */
        .then((mod) => WebAssembly.instantiate(mod, info))
        .then((instance) => receiveInstance(instance))
    }, { format: 'wasm32-unknown-emscripten2' })
    const result = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    assert.equal(result.Output, 1)

    const result2 = await handle(result.Memory,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    assert.equal(result2.Output, 2)
  })

  it('should load previous memory', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten' })
    const result = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    assert.equal(result.Output, 1)
    // assert.equal(result.GasUsed, 460321799)

    const result2 = await handle(result.Memory,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    assert.equal(result2.Output, 2)
    // assert.equal(result2.GasUsed, 503515860)
    assert.ok(true)
  })

  it.skip('should refill the gas on every invocation', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten' })

    const result = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    const result2 = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    /**
     * Some setup done by WASM consumes some ops, so the amounts won't quite match,
     * but they should be within ~75k of each other, effectively meaning the gas is not
     * "stacking" and being refilled every time
     */
    assert.ok(Math.abs(result.GasUsed - result2.GasUsed) < 600000)
  })

  it.skip('should run out of gas', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten', computeLimit: 9_000_000_000 })
    try {
      await handle(null,
        { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'foo' }], Data: '' },
        { Process: { Id: '1', Tags: [] } }
      )
    } catch (e) {
      assert.equal(e.message, 'out of gas!')
    }

    // console.log(result.GasUsed)
    assert.ok(true)
  })

  it.skip('should resize the initial heap to accomodate the larger incoming buffer', async () => {
    const wasmBinary = fs.readFileSync('./test/aos/process.wasm')

    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten', computeLimit: 9_000_000_000_000 })
    const mainResult = handle(null,
      {
        Owner: 'tom',
        Target: 'FOO',
        Tags: [
          { name: 'Action', value: 'Eval' }
        ],
        Module: '1234',
        'Block-Height': '1234',
        Id: '1234',
        Data: `
          Data = {}
          for i = 1, 100000 do
            table.insert(Data, "Hello")
          end
        `
      },
      {
        Process: { Owner: 'tom', Id: 'ctr-id-456', Tags: [{ name: 'Module', value: '1234' }], Module: '1234', 'Block-Height': '1234' }
      }
    )

    assert.ok(mainResult.Memory)
    assert.ok(mainResult.hasOwnProperty('Messages'))
    assert.ok(mainResult.hasOwnProperty('Spawns'))
    assert.ok(mainResult.hasOwnProperty('Error'))
    // assert.equal(mainResult.Output, 'Hello World')
    // assert.equal(mainResult.GasUsed, 463918939)
    assert.ok(true)

    const nextHandle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten' })
    const nextResult = nextHandle(mainResult.Memory,
      {
        Owner: 'tom',
        Target: 'FOO',
        Tags: [
          { name: 'Action', value: 'Eval' }
        ],
        Data: '#Data'
      },
      {
        Process: { Id: 'ctr-id-456', Tags: [] }
      }
    )
    assert.ok(nextResult.hasOwnProperty('Output'))
    assert.equal(nextResult.Output.data.output, 100000)
  })

  it('should get deterministic date', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten' })

    const result = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'Date' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    assert.equal(result.Output, '1970-01-01')

    const result2 = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'Date' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    assert.equal(result2.Output, '1970-01-01')

    // console.log(result.GasUsed)
    assert.ok(true)
  })

  it('should get deterministic random numbers', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten' })

    const result = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'Random' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    assert.equal(result.Output, 0.5)

    const result2 = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'Random' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    assert.equal(result2.Output, 0.5)

    // console.log(result.GasUsed)
    assert.ok(true)
  })

  it('should not list files', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten' })
    try {
      // eslint-disable-next-line
      const result = await handle(null,
        { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'Directory' }], Data: '' },
        { Process: { Id: '1', Tags: [] } }
      )
    } catch (e) {
      assert.equal(e, '[string ".process"]:47: \'popen\' not supported')
      assert.ok(true)
    }

    assert.ok(true)
  })
})
