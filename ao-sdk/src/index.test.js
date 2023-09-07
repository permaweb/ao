import test from 'node:test'
import assert from 'node:assert/strict'

const CONTRACT = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'

test('readState', async () => {
  const { readState } = await import('./index.js')
  const result = await readState(CONTRACT)
  console.log(result)
  assert.ok(true)
})

