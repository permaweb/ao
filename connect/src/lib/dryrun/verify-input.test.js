import { test } from 'node:test'
import * as assert from 'node:assert'

import { verifyInputWith } from './verify-input.js'

test('verify input of a message', async () => {
  const verifyInput = verifyInputWith()
  const res = await verifyInput({
    Id: '1234',
    Target: 'FOO_PROCESS',
    Owner: 'FOO_OWNER',
    Data: 'SOME DATA',
    Tags: [
      { name: 'Action', value: 'Balance' },
      { name: 'Target', value: 'MY_WALLET' }
    ]
  }).toPromise()

  assert.deepStrictEqual(res, {
    Id: '1234',
    Target: 'FOO_PROCESS',
    Owner: 'FOO_OWNER',
    Data: 'SOME DATA',
    Tags: [
      { name: 'Action', value: 'Balance' },
      { name: 'Target', value: 'MY_WALLET' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Message' },
      { name: 'Variant', value: 'ao.TN.1' }
    ]
  })
})
