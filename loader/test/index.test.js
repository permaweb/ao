import { describe, it } from 'node:test'
import * as assert from 'node:assert'

import hyperbeamLoader from '../src/index.cjs'
import fs from 'fs'

describe('loader', () => {
  it('load and execute lua contract', async () => {
    const wasmBinary = fs.readFileSync('./test/contract.wasm')
    const handle = hyperbeamLoader(wasmBinary)
    const result = await handle({ balances: { '1': 1 } }, { caller: '1', input: { function: 'balance' } }, {})
    console.log(result)
    assert.ok(true)
  })

  it('load and execute message passing contract', async () => {
    const wasmBinary = fs.readFileSync('./test/contract-message/contract.wasm')
    const mainHandler = hyperbeamLoader(wasmBinary)
    const mainResult = await mainHandler(
      {
        balances: { '1': 1 },
        sendToContract: 'ctr-id-123'
      },
      {
        input: { function: "noop" }
      },
      {
        transaction: { id: 'tx-id-123' },
        contract: { id: 'ctr-id-456' }
      }
    )
    console.log(mainResult.result)
    const { result: { messages: [message] } } = mainResult
    assert.deepStrictEqual(message, {
      target: 'ctr-id-123',
      txId: 'tx-id-123',
      message: {
        caller: 'ctr-id-456',
        qty: 10,
        type: 'transfer',
        from: 'ctr-id-456',
        to: 'ctr-id-123'
      }
    })
  })
})