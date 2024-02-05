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

describe('loader', async () => {
  it('load and execute message passing contract', async () => {
    const handle = await AoLoader(wasmBinary)
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
    assert.equal(mainResult.GasUsed, 463918939)
    assert.ok(true)
  })

  it('should load previous memory', async () => {
    const handle = await AoLoader(wasmBinary)
    const result = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    assert.equal(result.Output, 1)
    assert.equal(result.GasUsed, 460321799)

    const result2 = await handle(result.Memory,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    assert.equal(result2.Output, 2)
    assert.equal(result2.GasUsed, 503515860)
    assert.ok(true)
  })

  it('should run out of gas', async () => {
    const handle = await AoLoader(wasmBinary)

    const result = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'foo' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    assert.equal(result.Error, 'out of gas!')

    // console.log(result.GasUsed)
    assert.ok(true)
  })
})
