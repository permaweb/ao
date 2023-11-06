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
    const { default: hyperbeamLoader } = await import(MODULE_PATH)

    const wasmBinary = fs.readFileSync('./test/contracts/process.wasm')
    const mainHandler = await hyperbeamLoader(wasmBinary)
    const mainResult = await mainHandler(
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

    // const { result: { messages: [message] } } = mainResult
    // assert.deepStrictEqual(message, {
    //   target: 'ctr-id-123',
    //   txId: 'tx-id-123',
    //   message: {
    //     caller: 'ctr-id-456',
    //     qty: 10,
    //     type: 'transfer',
    //     from: 'ctr-id-456',
    //     to: 'ctr-id-123'
    //   }
    // })
    assert.ok(true)
  })
})
