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
        owner: 'tom',
        target: '',
        tags: [
          { name: 'function', value: 'count' }
        ]
      },
      {
        transaction: { id: 'tx-id-123' },
        process: { id: 'ctr-id-456' }
      }
    )
    assert.equal(mainResult.output, 'Hello World')

    assert.ok(true)
  })

  it('should load previous memory', async () => {
    const { default: AoLoader } = await import(MODULE_PATH)

    const wasmBinary = fs.readFileSync('./test/contracts/process2.wasm')
    const mainHandler = await AoLoader(wasmBinary)
    // spawn
    const result = mainHandler(null, { owner: 'tom', tags: [{ name: 'function', value: 'count' }] }, {})
    assert.equal(result.output, 'count: 1')

    const nextHandler = await AoLoader(wasmBinary)
    const result2 = nextHandler(result.buffer, { owner: 'tom', tags: [{ name: 'function', value: 'count' }] }, {})
    assert.equal(result2.output, 'count: 2')
    assert.ok(true)
  })
})
