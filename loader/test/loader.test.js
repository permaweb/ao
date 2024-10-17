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

/**
 * Test cases for both 32-bit and 64-bit versions.
 * Each test case includes the binary path and options specific to that architecture.
 */
const testCases = [
  {
    name: 'Emscripten4 (32-bit)', // Test for the 32-bit WASM
    binaryPath: './test/emscripten4/process.wasm', // Path to the 32-bit WASM binary
    options: { format: 'wasm32-unknown-emscripten4' } // Format for 32-bit
  },
  {
    name: 'Wasm64-Emscripten (64-bit)', // Test for the 64-bit WASM
    binaryPath: './test/wasm64-emscripten/process.wasm', // Path to the 64-bit WASM binary
    options: { format: 'wasm64-unknown-emscripten-draft_2024_02_15' } // Format for 64-bit
  },
  {
    name: 'Emscripten4 Metering (32-bit)', // Test for the 32-bit WASM
    binaryPath: './test/emscripten4/process.wasm', // Path to the 32-bit WASM binary
    options: { format: 'wasm32-unknown-emscripten-metering' } // Format for 32-bit metering
  },
  {
    name: 'Wasm64-Emscripten Metering (64-bit)', // Test for the 64-bit WASM
    binaryPath: './test/wasm64-emscripten/process.wasm', // Path to the 64-bit WASM binary
    options: { format: 'wasm64-unknown-emscripten-draft_2024_10_16-metering' } // Format for 64-bit metering
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

describe('AoLoader Functionality Tests', () => {
  // Iterate over each test case (32-bit and 64-bit)
  for (const testCase of testCases) {
    const { name, binaryPath, options } = testCase
    const wasmBinary = fs.readFileSync(binaryPath) // Load the WASM binary

    describe(`${name}`, () => {
      it('load wasm and evaluate message', async () => {
        const handle = await AoLoader(wasmBinary, options)
        const mainResult = await handle(null, getMsg('return \'Hello World\''), getEnv())

        // Check basic properties of the result
        assert.ok(mainResult.Memory)
        assert.ok(mainResult.hasOwnProperty('Messages'))
        assert.ok(mainResult.hasOwnProperty('Spawns'))
        assert.ok(mainResult.hasOwnProperty('Error'))
        assert.equal(mainResult.Output.data, 'Hello World') // Expect 'Hello World' in output
      })

      it('should use separately instantiated WebAssembly.Instance', async () => {
        // Compile and instantiate a separate WebAssembly instance
        const wasmModuleP = WebAssembly.compileStreaming(
          new Response(
            Readable.toWeb(createReadStream(binaryPath)),
            { headers: { 'Content-Type': 'application/wasm' } }
          ),
          options
        )

        // Set up a loader and check the separate instance
        const handle = await AoLoader((info, receiveInstance) => {
          assert.ok(info)
          assert.ok(receiveInstance)
          wasmModuleP
            .then((mod) => WebAssembly.instantiate(mod, info))
            .then((instance) => receiveInstance(instance))
        }, options)

        // Evaluate the message and verify the result
        const result = await handle(null, getMsg('count = 1\nreturn count'), getEnv())
        assert.equal(result.Output.data, 1)

        const result2 = await handle(result.Memory, getMsg('count = count + 1\nreturn count'), getEnv())
        assert.equal(result2.Output.data, 2)
      })

      /* TODO: Add tests to make sure the loader:
                1. ) Creates the correct instance based on the format
                2. ) Creates a /data directory using FS_createPath
                3. ) Correctly determines the doHandle function based on the format
                4. ) If a buffer is passed, it is used as the memory and resizes the HEAP
                5. ) Checks to make sure Memory, Messages, Spawns, GasUsed, Assignments, Output, and Error are returned
            */

      // TODO: This test should not be part of loader tests
      it('should get deterministic date', async () => {
        const handle = await AoLoader(wasmBinary, options)

        // Verify that the date returned is deterministic
        const result = await handle(null, getMsg('return os.date("%Y-%m-%d")'), getEnv())
        assert.ok(result.Output.data === '1970-01-01' || result.Output.data === '1969-12-31')
      })

      // TODO: This test should not be part of loader tests
      it('should get deterministic random numbers', async () => {
        let handle = await AoLoader(wasmBinary, options)

        // Verify deterministic random number generation
        const result = await handle(null, getMsg('return math.random(1, 10)'), getEnv())
        assert.equal(result.Output.data, 4)

        handle = await AoLoader(wasmBinary, options)
        const result2 = await handle(null, getMsg('return math.random(1, 10)'), getEnv())
        assert.equal(result2.Output.data, 4)
      })
    })
  }
})
