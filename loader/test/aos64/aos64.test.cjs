const { describe, it } = require('node:test')
const assert = require('assert')
const fs = require('fs')
const weaveDrive = require('./weavedrive.cjs')

const MODULE_PATH = process.env.MODULE_PATH || '../../src/index.cjs'

console.log(`${MODULE_PATH}`)

const wasmBinary = fs.readFileSync('./test/aos64/aos64.wasm')

describe('AOS-Llama+VFS Tests', async () => {
  const { default: AoLoader } = await import(MODULE_PATH)

  it('Create instance', async () => {
    const handle = await AoLoader(wasmBinary, { format: 'wasm64-unknown-emscripten-draft_2024_02_15', WeaveDrive: weaveDrive })
    const result = await handle(null,
      {
        Id: 'FOO',
        Owner: 'tom',
        Target: 'AOS',
        Tags: [
          { name: 'Action', value: 'Eval' }
        ],
        Data: `
  local result = ""
  local Llama = require('llama')
  Llama.load('/data/ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo')
  Llama.setPrompt([[<|user|>Tell me a great story<|assistant|>]])
  for i = 0, 10, 1 do
    local token = Llama.next()
    result = result .. token
  end
  return result
        `,
        Module: '1234',
        ['Block-Height']: '1000'
      },
      {
        Process: { Id: 'ctr-id-456', Tags: [] }
      }
    )
    console.log(result.Output)
    assert.ok(true)
  })
})