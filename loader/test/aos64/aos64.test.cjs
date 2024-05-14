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
        Target: 'FOO',
        Tags: [
          { name: 'Action', value: 'Eval' }
        ],
        Data: '1 + 1',
        Module: '1234',
        ['Block-Height']: '1000'
      },
      {
        Process: { Id: 'ctr-id-456', Tags: [] }
      }
    )
    console.log(result)
    assert.ok(true)
  })
})

function getLua(model, len, prompt) {
  if (!prompt) {
    prompt = "Tell me a story."
  }
  return getEval(`
  local Llama = require("llama")
  io.stderr:write([[Loading model...\n]])
  Llama.load('/data/${model}')
  io.stderr:write([[Loaded! Setting prompt...\n]])
  Llama.setPrompt([[${prompt}]])
  local result = ""
  io.stderr:write([[Running...\n]])
  for i = 0, ${len.toString()}, 1 do
    local token = Llama.next()
    result = result .. token
    io.stderr:write([[Got token: ]] .. token .. [[\n\n]])
  end
  return result`);
}

function getEval(expr) {
  return {
    Id: '1',
    Owner: 'TOM',
    Module: 'FOO',
    From: 'foo',
    'Block-Height': '1000',
    Timestamp: Date.now(),
    Tags: [
      { name: 'Action', value: 'Eval' }
    ],
    Data: expr
  }
}

function getEnv() {
  return {
    Process: {
      Id: 'AOS',
      Owner: 'TOM',
      Tags: [
        { name: 'Name', value: 'Thomas' }
      ]
    }
  }
}