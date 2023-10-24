import readline from 'node:readline'
import fs from 'node:fs'

import AoLoader from '@permaweb/ao-loader'

const wasm = fs.readFileSync('./contract.wasm')
const handle = AoLoader(wasm)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const AO = {
  process: {
    id: 'PROCESS_TEST',
    owner: 'TOM'
  }
}

function repl (state) {
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

  rl.question(state.prompt || 'aos> ', async function (line) {
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
      response = await handle(state, message, AO)
      console.log(JSON.stringify(response))
      console.log(response.result.output)
      // Continue the REPL
      repl(response.state)
    } catch (err) {
      console.log('Error:', err)
      process.exit(0)
    }
  })
}

repl({ inbox: [], owner: 'TOM', prompt: ':) ', _fns: {} })
