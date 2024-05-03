/* eslint-disable no-prototype-builtins */

import { test } from 'node:test'
import * as assert from 'node:assert'
import fs from 'fs'

/**
 * dynamic import, so we can run unit tests against the source
 * and integration tests against the bundled distribution
 */
const MODULE_PATH = process.env.MODULE_PATH || '../src/index.cjs'

console.log(`${MODULE_PATH}`)

const { default: AoLoader } = await import(MODULE_PATH)
const wasmBinary = fs.readFileSync('./test/aos64/process.wasm')

test('load via VFS', async () => {
  const handle = await AoLoader(wasmBinary, {
    format: 'wasm64-unknown-emscripten-draft_2024_02_15',
    extensions: ['VFS-1']
  })
  let result = await handle(null, getDataItem(), getEnv())

  // console.log(result.Output.data)
  result = await handle(result.Memory, getEval(`
local filePath = '/data/FOOBAR.bin'
local file = io.open(filePath, 'r')
local content = "nothing"
if file then
  content = file:read("*a")
  file:close()
end
return #content
  `), getEnv())

  console.log(result.Output)
  assert.ok(true)
})

function getEval (expr) {
  return {
    Owner: 'AOS',
    Target: 'AOS',
    'Block-Height': '1000',
    Id: '1234xyxfoo',
    Module: 'WOOPAWOOPA',
    Tags: [
      { name: 'Action', value: 'Eval' }
    ],
    Data: expr
  }
}
function getDataItem () {
  return {
    Owner: 'AOS',
    Target: 'AOS',
    'Block-Height': '1000',
    Id: 'ABCD1234',
    Module: 'WOOPAWOOPA',
    Tags: [
      { name: 'Content-Type', value: 'application/octet-stream' }
    ]
  }
}

function getEnv () {
  return {
    Process: { Owner: 'AOS', Id: 'ctr-id-456', Tags: [{ name: 'Module', value: '1234' }], Module: '1234', 'Block-Height': '1234' }
  }
}
