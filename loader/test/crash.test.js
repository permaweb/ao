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
  it('try to reproduce error', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm32-unknown-emscripten2', computeLimit: 9_000_000_000_000 })
    const mainResult = await handle(null,
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
for i = 1, 10000 do
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

    const nextResult = await handle(mainResult.Memory,
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
    assert.equal(nextResult.Output.data.output, 10000)
  })
})
