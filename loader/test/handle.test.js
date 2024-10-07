import { test } from 'node:test'
import * as assert from 'node:assert'
import fs from 'fs'

const MODULE_PATH = process.env.MODULE_PATH || '../src/index.cjs'

const env = {
  Process: {
    Id: 'AOS',
    Owner: 'FOOBAR',
    Tags: [
      { name: 'Name', value: 'Thomas' }
    ]
  }
}
const msg = (cmd) => ({
  Target: 'AOS',
  Owner: 'FOOBAR',
  'Block-Height': '1000',
  Id: '1234xyxfoo',
  Module: 'WOOPAWOOPA',
  Tags: [
    { name: 'Action', value: 'Eval' }
  ],
  Data: cmd
})

const { default: AoLoader } = await import(MODULE_PATH)
const wasm = fs.readFileSync('./test/aos/process.wasm')

test('do return memory based on outputMemory option', async () => {
  const handle = await AoLoader(wasm, { format: 'wasm32-unknown-emscripten2' })
  const testMsg = msg('X = 1')

  const result1 = await handle(null, testMsg, env, { outputMemory: true })
  assert.ok(result1.Memory)

  const result2 = await handle(result1.Memory, testMsg, env, { outputMemory: false })
  assert.equal(result2.Memory, null)
})
