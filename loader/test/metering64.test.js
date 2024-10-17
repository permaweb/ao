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

const binaryPath = './test/wasm64-emscripten/process.wasm'
const wasmBinary = fs.readFileSync(binaryPath)

const options = { format: 'wasm64-unknown-emscripten-draft_2024_10_16-metering' } // Same binary as wasm32-unknown-emscripten4 but with metering

/* Helper functions */
function getMsg (Data, Action = 'Eval') {
  return {
    Target: '1',
    From: 'FOOBAR',
    Owner: 'FOOBAR',

    Module: 'FOO',
    Id: '1',

    'Block-Height': '1000',
    Timestamp: Date.now(),
    Tags: [{ name: 'Action', value: Action }],
    Data
  }
}

function getEnv () {
  return {
    Process: {
      Id: '1',
      Owner: 'FOOBAR',

      Tags: [{ name: 'Name', value: 'TEST_PROCESS_OWNER' }]
    }
  }
}

describe('loader', async () => {
  it('load wasm and evaluate message', async () => {
    const handle = await AoLoader(wasmBinary, options)
    const mainResult = await handle(null, getMsg('return \'Hello World\''), getEnv())

    assert.ok(mainResult.Memory)
    assert.ok(mainResult.hasOwnProperty('Messages'))
    assert.ok(mainResult.hasOwnProperty('Spawns'))
    assert.ok(mainResult.hasOwnProperty('Error'))
    assert.equal(mainResult.Output.data, 'Hello World')
    assert.ok(mainResult.GasUsed > 0)
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
        Readable.toWeb(createReadStream(binaryPath)),
        { headers: { 'Content-Type': 'application/wasm' } }
      ),
      options
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
    }, options)
    const result = await handle(null, getMsg(`
      count = 1
      return count
    `), getEnv())

    assert.equal(result.Output.data, 1)

    const result2 = await handle(result.Memory, getMsg(`
      count = count + 1
      return count
    `), getEnv())

    assert.equal(result2.Output.data, 2)
  })

  it('should load previous memory', async () => {
    const handle = await AoLoader(wasmBinary, options)

    const result = await handle(null, getMsg(`
      count = 1
      return count
    `), getEnv())

    assert.equal(result.Output.data, 1)
    assert.ok(result.GasUsed > 0)

    const result2 = await handle(result.Memory, getMsg(`
      count = count + 1
      return count
    `), getEnv())

    assert.equal(result2.Output.data, 2)
    assert.ok(result2.GasUsed > 0)
  })

  it('should refill the gas on every invocation', async () => {
    const handle = await AoLoader(wasmBinary, options)

    const result = await handle(null, getMsg(`
      count = 1
      return count
    `), getEnv())

    assert.equal(result.Output.data, 1)
    assert.ok(result.GasUsed > 0)

    const result2 = await handle(result.Memory, getMsg(`
      count = count + 1
      return count
    `), getEnv())

    assert.equal(result2.Output.data, 2)
    assert.ok(result2.GasUsed > 0)

    /**
     * Some setup done by WASM consumes some ops, so the amounts won't quite match,
     * but they should be within ~10.7B of each other, effectively meaning the gas is not
     * "stacking" and being refilled every time
     */
    const gasDiff = Math.abs(result.GasUsed - result2.GasUsed)
    assert.ok(gasDiff < 10700000000)
  })

  it('should run out of gas', async () => {
    const handle = await AoLoader(wasmBinary, { format: options.format, computeLimit: 10_750_000_000 })
    try {
      await handle(null, getMsg(`
        count = 0
        for i = 1, 1000 do
          count = count + 1
        end
        return count
      `), getEnv())
      assert.ok(false)
    } catch (e) {
      assert.equal(e.message, 'out of gas!')
    }
  })

  it('should get deterministic date', async () => {
    const handle = await AoLoader(wasmBinary, options)

    const result = await handle(null, getMsg('return os.date("%Y-%m-%d")'), getEnv())
    assert.ok(result.Output.data === '1970-01-01' || result.Output.data === '1969-12-31')

    const result2 = await handle(null, getMsg('return os.date("%Y-%m-%d")'), getEnv())
    assert.ok(result2.Output.data === '1970-01-01' || result2.Output.data === '1969-12-31')
  })

  it('should get deterministic random numbers', async () => {
    let handle = await AoLoader(wasmBinary, options)
    const result = await handle(null, getMsg('return math.random(1, 10)'), getEnv())
    assert.equal(result.Output.data, 4)

    handle = await AoLoader(wasmBinary, options)
    const result2 = await handle(null, getMsg('return math.random(1, 10)'), getEnv())
    assert.equal(result2.Output.data, 4)
  })

  it('should not list files', async () => {
    const handle = await AoLoader(wasmBinary, options)

    const result = await handle(null, getMsg(`
      Files = {}
      local command = string.format('ls %s', '/')
      local p = io.popen(command)
      for file in p:lines() do table.insert(Files, file) end
      p:close()
      return {Output = Files}
    `), getEnv())

    assert.ok(result.Error.includes("'popen' not supported"))
  })

  it('should handle Assignments', async () => {
    const handle = await AoLoader(wasmBinary, options)

    // eslint-disable-next-line
    const result = await handle(null, getMsg(`
      local json = require('json')
      ao.assign({ Processes = { 'pid-1', 'pid-2' }, Message = 'mid-1' })
      ao.assign({ Processes = { 'pid-1', 'pid-2' }, Message = 'mid-2' })
      return json.encode(ao.outbox.Assignments)
    `), getEnv())

    assert.deepStrictEqual(
      JSON.parse(result.Output.data),
      [
        { Processes: ['pid-1', 'pid-2'], Message: 'mid-1' },
        { Processes: ['pid-1', 'pid-2'], Message: 'mid-2' }
      ]
    )
  })

  it('metering should only apply to metering formats', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten-draft_2024_02_15' })

    const result = await handle(null, getMsg('return \'Hello World\''), getEnv())

    assert.equal(result.GasUsed, 0)
  })
})
