import readline from 'node:readline'
import fs from 'node:fs'

import AoLoader from '@permaweb/ao-loader'

const wasm = fs.readFileSync('./process.wasm')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const env = {
  process: {
    id: 'PROCESS_TEST',
    owner: 'TOM'
  }
}
let prompt = 'aos'

async function repl (state) {
  const handle = await AoLoader(wasm)

  rl.question(prompt + '> ', async function (line) {
    // Exit the REPL if the user types "exit"
    if (line === 'exit') {
      console.log('Exiting...')
      rl.close()
      return
    }
    let response = {}
    // Evaluate the JavaScript code and print the result
    try {
      const message = createMessage(line)
      response = handle(state, message, env)
      console.log(response.output.data.output)
      if (response.output.data.prompt) {
        prompt = response.output.data.prompt
      }
      // Continue the REPL
      await repl(response.buffer)
    } catch (err) {
      console.log('Error:', err)
      process.exit(0)
    }
  })
}

repl(null)

function createMessage (expr) {
  return {
    owner: 'TOM',
    target: 'PROCESS',
    tags: [
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'ao-type', value: 'message' },
      { name: 'function', value: 'eval' },
      { name: 'expression', value: expr }
    ]
  }
}
