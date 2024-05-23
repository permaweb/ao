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
const wasmBinary = fs.readFileSync('./test/aos/process.wasm')

describe('loader', async () => {
  it('evaluate system message', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm32-unknown-emscripten2' })
    const mainResult = await handle(null,
      {
        Id: '1',
        Owner: 'tom',
        Target: 'FOO',
        Tags: [
          { name: 'Action', value: 'Eval' }
        ],
        Data: 'os.execute("echo beep > foo.txt")',
        Module: 'foo',
        'Block-Height': '1000',
        Timestamp: Date.now()
      },
      {
        Process: { Id: 'ctr-id-456', Tags: [] }
      }
    )

    assert.ok(mainResult.Memory)
    assert.ok(mainResult.hasOwnProperty('Messages'))
    assert.ok(mainResult.hasOwnProperty('Spawns'))
    assert.ok(mainResult.hasOwnProperty('Error'))
    assert.equal(mainResult.Error, 'Function not implemented')
    assert.equal(mainResult.Output, undefined)
    // assert.equal(mainResult.GasUsed, 463918939)
    assert.ok(true)
  })
})
