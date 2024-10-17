/* eslint-disable no-prototype-builtins */

import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import fs from 'fs'

/**
 * dynamic import, so we can run unit tests against the source
 * and integration tests against the bundled distribution
 */
const MODULE_PATH = process.env.MODULE_PATH || '../src/index.cjs'

console.log(`${MODULE_PATH}`)

const { default: AoLoader } = await import(MODULE_PATH)

/**
 * Test cases for both 32-bit and 64-bit versions.
 * Each test case includes the binary path and options specific to that architecture.
 */
const testCases = [
  {
    name: 'Emscripten4 Metering (32-bit)', // Test for the 32-bit WASM
    binaryPath: './test/emscripten4/process.wasm', // Path to the 32-bit WASM binary
    options: { format: 'wasm32-unknown-emscripten-metering' }, // Format for 32-bit metering
    standardOptions: { format: 'wasm32-unknown-emscripten4' } // Format for 32-bit standard
  },
  {
    name: 'Wasm64-Emscripten Metering (64-bit)', // Test for the 64-bit WASM
    binaryPath: './test/wasm64-emscripten/process.wasm', // Path to the 64-bit WASM binary
    options: { format: 'wasm64-unknown-emscripten-draft_2024_10_16-metering' }, // Format for 64-bit metering
    standardOptions: { format: 'wasm64-unknown-emscripten-draft_2024_02_15' } // Format for 64-bit standard
  }
]

/* Helper function to generate test messages */
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

/* Helper function to generate test environment variables */
function getEnv () {
  return {
    Process: {
      Id: '1',
      Owner: 'FOOBAR',
      Tags: [{ name: 'Name', value: 'TEST_PROCESS_OWNER' }]
    }
  }
}

describe('AoLoader Metering Tests', () => {
  // Iterate over each test case (32-bit and 64-bit)
  for (const testCase of testCases) {
    const { name, binaryPath, options, standardOptions } = testCase
    const wasmBinary = fs.readFileSync(binaryPath) // Load the WASM binary

    describe(`${name}`, () => {
      it('should use gas for computation', async () => {
        const handle = await AoLoader(wasmBinary, options)

        const initial = await handle(null, getMsg('return "OK"'), getEnv())

        // Test that gas is used for computation
        const result = await handle(initial.Memory, getMsg('return 1+1'), getEnv())
        assert.ok(result.GasUsed > 0)

        const result2 = await handle(initial.Memory, getMsg('return 1+1+1'), getEnv())
        assert.ok(result2.GasUsed > result.GasUsed)
      })

      it('should load previous memory and refill gas', async () => {
        const handle = await AoLoader(wasmBinary, options)

        // Test loading previous memory and ensuring gas is refilled on each invocation
        // The first invocation always uses alot more gas than subsequent invocations due to setup
        const initial = await handle(null, getMsg('count = 1\nreturn count'), getEnv())
        assert.equal(initial.Output.data, 1)
        assert.ok(initial.GasUsed > 0)

        // Thats why we need to run the function twice to get a more accurate gas usage comparison
        const result = await handle(initial.Memory, getMsg('count = count + 1\nreturn count'), getEnv())
        assert.equal(result.Output.data, 2)
        assert.ok(result.GasUsed > 0)

        const result2 = await handle(result.Memory, getMsg('count = count + 1\nreturn count'), getEnv())
        assert.equal(result2.Output.data, 3)
        assert.ok(result2.GasUsed > 0)

        // Check that gas usage difference is within an acceptable range
        const gasDiff = Math.abs(result.GasUsed - result2.GasUsed)
        assert.ok(gasDiff < 900000)
      })

      it('should run out of gas', async () => {
        // Test that the function will run out of gas when exceeding the compute limit
        const handle = await AoLoader(wasmBinary, { format: options.format, computeLimit: 10_750_000_000 })
        try {
          await handle(null, getMsg(`
                        count = 0
                        for i = 1, 1000 do
                            count = count + 1
                        end
                        return count
                    `), getEnv())
          assert.ok(false) // Should not reach here
        } catch (e) {
          assert.equal(e.message, 'out of gas!') // Expect an out-of-gas error
        }
      })

      it('metering should only apply to metering formats', async () => {
        // Verify that metering only applies to specific formats
        const handle = await AoLoader(wasmBinary, standardOptions)
        const result = await handle(null, getMsg('return \'Hello World\''), getEnv())
        assert.equal(result.GasUsed, 0) // No gas usage in non-metered format
      })

      /* TODO: Some other possible tests for metering:
              1. ) Confirm that WebAssembly.compile is being overridden
              2. ) Confirm that WebAssembly.compileStreaming is being overridden
            */
    })
  }
})
