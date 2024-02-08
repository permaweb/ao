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
  it('should clear wasm binary after evals', async () => {
    const handle = await AoLoader(wasmBinary)
    const result = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    assert.equal(result.Output, 1)

    const handle2 = await AoLoader(wasmBinary)
    const result2 = await handle2(null,
      { Owner: 'bill', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    assert.equal(result2.Output, 1)

    const handle3 = await AoLoader(wasmBinary)
    const result3 = await handle3(result.Memory,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    assert.equal(result3.Output, 2)

    const handle4 = await AoLoader(wasmBinary)
    const result4 = await handle4(result2.Memory,
      { Owner: 'bill', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    const handle5 = await AoLoader(wasmBinary)
    const result5 = await handle5(result4.Memory,
      { Owner: 'bill', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    const handle6 = await AoLoader(wasmBinary)
    const result6 = await handle6(result5.Memory,
      { Owner: 'bill', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    assert.equal(result6.Output, 4)

    const handle7 = await AoLoader(wasmBinary)
    const result7 = await handle7(result3.Memory,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'inc' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )
    assert.equal(result7.Output, 3)
  })
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
    // assert.equal(mainResult.GasUsed, 463918939)
    assert.ok(true)
  })

  it('should load previous memory', async () => {
    const handle = await AoLoader(wasmBinary)
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

  it('should refill the gas on every invocation', async () => {
    const handle = await AoLoader(wasmBinary)

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
    assert.ok(Math.abs(result.GasUsed - result2.GasUsed) < 75000)
  })

  it('should run out of gas', async () => {
    const handle = await AoLoader(wasmBinary)
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

  it('should get deterministic date', async () => {
    const handle = await AoLoader(wasmBinary)

    const result = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'Date' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    assert.equal(result.Output, '2022-01-01')

    const result2 = await handle(null,
      { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'Date' }], Data: '' },
      { Process: { Id: '1', Tags: [] } }
    )

    assert.equal(result2.Output, '2022-01-01')

    // console.log(result.GasUsed)
    assert.ok(true)
  })

  it('should get deterministic random numbers', async () => {
    const handle = await AoLoader(wasmBinary)

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
    const handle = await AoLoader(wasmBinary)
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
  // TODO: need to figure out a way to test out of memory
  // it('should run out of memory', async () => {

  //   const handle = await AoLoader(wasmBinary, 9000000000000)

  //   const result = await handle(null,
  //     { Owner: 'tom', Target: '1', Tags: [{ name: 'Action', value: 'Memory' }], Data: '' },
  //     { Process: { Id: '1', Tags: [] } }
  //   )
  //   console.log('result: ', result)
  //   //assert.equal(result.Error, 'Out of memory')
  //   assert.ok(true)
  // })
})
