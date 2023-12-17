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

describe('loader', async () => {
  it('load and execute message passing contract', async () => {
    const { default: AoLoader } = await import(MODULE_PATH)

    const wasmBinary = fs.readFileSync('./test/contracts/process.wasm')
    const mainHandler = await AoLoader(wasmBinary)
    const mainResult = mainHandler(
      null,
      {
        Owner: 'tom',
        Target: '',
        Tags: [
          { name: 'function', value: 'hello' },
          { name: 'recipient', value: 'World' }
        ]
      },
      {
        process: { id: 'ctr-id-456' }
      }
    )

    assert.ok(mainResult.Memory)
    assert.ok(mainResult.hasOwnProperty('Messages'))
    assert.ok(mainResult.hasOwnProperty('Spawns'))
    assert.ok(mainResult.hasOwnProperty('Error'))
    assert.equal(mainResult.Output, 'Hello World')

    assert.ok(true)
  })

  it('should load previous memory', async () => {
    const { default: AoLoader } = await import(MODULE_PATH)

    const wasmBinary = fs.readFileSync('./test/contracts/process.wasm')
    const mainHandler = await AoLoader(wasmBinary)
    // spawn
    const result = mainHandler(null, { Owner: 'tom', Tags: [{ name: 'function', value: 'count' }] }, {})
    assert.equal(result.Output, 'count: 1')

    const nextHandler = await AoLoader(wasmBinary)
    const result2 = nextHandler(result.Memory, { Owner: 'tom', Tags: [{ name: 'function', value: 'count' }] }, {})
    assert.equal(result2.Output, 'count: 2')
    assert.ok(true)
  })
})
