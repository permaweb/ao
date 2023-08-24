import { test } from 'uvu'
import * as assert from 'uvu/assert'

import hyperbeamLoader from '../src/index.cjs'
import fs from 'fs'

test('load and execute lua contract', async () => {
  const wasmBinary = fs.readFileSync('./test/contract.wasm')
  const handle = hyperbeamLoader(wasmBinary)
  const result = await handle({ balances: { '1': 1 }}, { caller: '1', input: {function: 'balance'}}, {})
  console.log(result)
  assert.ok(true)
})


test.run()