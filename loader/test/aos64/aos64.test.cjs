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
    const handle = await AoLoader(wasmBinary, {
      format: 'wasm64-unknown-emscripten-draft_2024_02_15',
      WeaveDrive: weaveDrive,
      admissableList: [
        "dx3GrOQPV5Mwc1c-4HTsyq0s1TNugMf7XfIKJkyVQt8", // Random NFT metadata (1.7kb of JSON)
        "XOJ8FBxa6sGLwChnxhF2L71WkKLSKq1aU5Yn5WnFLrY", // GPT-2 117M model.
        "M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc", // GPT-2-XL 4-bit quantized model.
        "kd34P4974oqZf2Db-hFTUiCipsU6CzbR6t-iJoQhKIo", // Phi-2 
        "ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo", // Phi-3 Mini 4k Instruct
        "sKqjvBbhqKvgzZT4ojP1FNvt4r_30cqjuIIQIr-3088", // CodeQwen 1.5 7B Chat q3
        "Pr2YVrxd7VwNdg6ekC0NXWNKXxJbfTlHhhlrKbAd1dA", // Llama3 8B Instruct q4
        "jbx-H6aq7b3BbNCHlK50Jz9L-6pz9qmldrYXMwjqQVI"  // Llama3 8B Instruct q8
      ],
      ARWEAVE: 'https://arweave.net',
      mode: "test",
      blockHeight: 100,

      spawn: {
        "Scheduler": "TEST_SCHED_ADDR"
      },

      process: {
        id: "TEST_PROCESS_ID",
        owner: "TEST_PROCESS_OWNER",
        tags: [
          { name: "Extension", value: "Weave-Drive" }
        ]
      }


    })
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
  Llama.load('/data/kd34P4974oqZf2Db-hFTUiCipsU6CzbR6t-iJoQhKIo')
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