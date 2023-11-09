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
    owner: 'OWNER'
  }
}

async function repl (state) {
  const handle = await AoLoader(wasm)

  rl.question('hello world' + '> ', async function (line) {
    // Exit the REPL if the user types "exit"
    if (line === 'exit') {
      console.log('Exiting...')
      rl.close()
      return
    }
    // Evaluate the JavaScript code and print the result
    try {
      const message = createMessage(line)
      const { buffer, output } = handle(state, message, env)
      if (output) console.log(JSON.parse(output))
      // Continue the REPL
      await repl(buffer)
    } catch (err) {
      console.log('Error:', err)
      process.exit(0)
    }
  })
}

repl(null)

function createMessage (expr) {
  return {
    owner: 'OWNER',
    target: 'PROCESS',
    tags: [
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'ao-type', value: 'message' },
      { name: 'function', value: expr }
    ]
  }
}
