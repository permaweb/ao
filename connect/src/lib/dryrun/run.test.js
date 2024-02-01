import { test } from 'node:test'
import * as assert from 'node:assert'

import { runWith } from './run.js'

test('run should return a Result', async () => {
  const run = runWith({
    dryrunFetch: (msg) => {
      return Promise.resolve({
        Output: 'Success',
        Messages: [],
        Spawns: []
      })
    }
  })

  const res = await run({
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
  }).toPromise()

  assert.deepStrictEqual(res, {
    Output: 'Success',
    Messages: [],
    Spawns: []
  })
})
