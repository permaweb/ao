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
const wasmBinary = fs.readFileSync('./test/process/process.wasm')

describe('crypto', async () => {
  it('load wasm and hash message', async () => {
    const handle = await AoLoader(wasmBinary)
    const mainResult = await handle(null,
      {
        Owner: 'tom',
        Target: 'FOO',
        Tags: [
          { name: 'Action', value: 'hash' }
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
    assert.equal(mainResult.Output, 'vJ2q-OrRwXJMt2CnVmMVM2CeyYya5gUxUsAlIkxPMsM')
    // assert.equal(mainResult.GasUsed, 463918939)
    assert.ok(true)
  })

  // it('load wasm and verify message', async () => {
  //   const handle = await AoLoader(wasmBinary)
  //   const mainResult = await handle(null,
  //     {
  //       Owner: 'tom',
  //       Target: 'FOO',
  //       Tags: [
  //         { name: 'Action', value: 'hash' }
  //       ],
  //       Data: 'Hello World'
  //     },
  //     {
  //       Process: { Id: 'ctr-id-456', Tags: [] }
  //     }
  //   )

  //   assert.ok(mainResult.Memory)
  //   assert.ok(mainResult.hasOwnProperty('Messages'))
  //   assert.ok(mainResult.hasOwnProperty('Spawns'))
  //   assert.ok(mainResult.hasOwnProperty('Error'))
  //   assert.equal(mainResult.Output, 'vJ2q-OrRwXJMt2CnVmMVM2CeyYya5gUxUsAlIkxPMsM')
  //   // assert.equal(mainResult.GasUsed, 463918939)
  //   assert.ok(true)
  // })
})
