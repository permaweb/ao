import { test } from 'uvu'
import * as assert from 'uvu/assert'

const CONTRACT = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'

test('readState', async () => {
  const { readState } = await import('./index.js')
  const result = await readState(CONTRACT)
  console.log(result)
  assert.ok(true)
})

test.run()