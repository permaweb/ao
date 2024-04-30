import { test } from 'node:test'
import * as assert from 'node:assert'
import fs from 'fs'
import { getDataItem } from './get-dataitem.js'

const MODULE_PATH = process.env.MODULE_PATH ? '../' + process.env.MODULE_PATH : '../../src/index.cjs'
const { default: AoLoader } = await import(MODULE_PATH)
const wasm = fs.readFileSync('./test/aos-llama/AOS.wasm')
const options = { format: 'wasm32-unknown-emscripten3', computeLimit: 9e12 }

test('Load the compiled AOS module and Llama library.', async () => {
  const handle = await AoLoader(wasm, options)
  const env = {
    Process: {
      Id: 'AOS',
      Owner: 'FOOBAR',
      Tags: [
        { name: 'Name', value: 'Thomas' }
      ]
    }
  }
  const msg = {
    Target: 'AOS',
    Owner: 'FOOBAR',
    'Block-Height': '1000',
    Id: '1234xyxfoo',
    Module: 'WOOPAWOOPA',
    Tags: [
      { name: 'Action', value: 'Eval' }
    ],
    Data: `
    local llama = require("llama")

    return llama.loadModel('m9ibqUzBAwc8PXgMXHBw5RP_TR-Ra3vJnt90RTTuuLg', function () print("Loaded") end)
    `
  }
  let result = await handle(null, msg, env)
  // assert.equal(result, [])
  console.log(result.Assignments)
  assert.deepEqual(result.Assignments, [{
    Processes: [
      'AOS'
    ],
    Message: 'm9ibqUzBAwc8PXgMXHBw5RP_TR-Ra3vJnt90RTTuuLg'
  }])
  assert.equal('ok', 'ok')
  result = await handle(
    result.Memory,
    await getDataItem(result.Assignments[0].Message),
    env
  )

  // console.log(result2)
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

  result = await handle(
    result.Memory,
    await getDataItem(result.Assignments[0].Message),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

  result = await handle(
    result.Memory,
    await getDataItem(result.Assignments[0].Message),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

  result = await handle(
    result.Memory,
    await getDataItem(result.Assignments[0].Message),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

  result = await handle(
    result.Memory,
    await getDataItem(result.Assignments[0].Message),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

  result = await handle(
    result.Memory,
    await getDataItem(result.Assignments[0].Message),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

  result = await handle(
    result.Memory,
    await getDataItem(result.Assignments[0].Message),
    env
  )
  console.log(result.Assignments)
  assert.equal('ok', 'ok')

  result = await handle(
    result.Memory,
    {
      Target: 'AOS',
      Owner: 'FOOBAR',
      'Block-Height': '1000',
      Id: '1234xyxfoo',
      Module: 'WOOPAWOOPA',
      Tags: [
        { name: 'Action', value: 'Eval' }
      ],
      Data: `
      local llama = require("llama")
  
      llama.setPrompt('Hello World')
      return llama.generate(30)
      `
    },
    env
  )
  console.log(result.Output.data.output)
  assert.equal('ok', 'ok')
})
