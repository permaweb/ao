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

  rl.question('aorc' + '> ', async function (line) {
    // Exit the REPL if the user types "exit"
    if (line === 'exit') {
      console.log('Exiting...')
      rl.close()
      return
    }
    // Evaluate the JavaScript code and print the result
    try {
      const message = await createMessage(line)
      const { buffer, output, messages } = handle(state, message, env)
      if (messages.length > 0) {
        console.log('Message: ', messages[0])
        console.log(`Message sent to ${messages.length} receivers.`)
      }
      if (output) console.log(JSON.parse(output))
      // Continue the REPL
      await repl(buffer)
    } catch (err) {
      repl(Buffer.from(null))
    }
  })
}

repl(null)

async function createMessage (expr) {
  const message = {
    owner: 'JSHAW',
    target: 'PROCESS_TEST',
    tags: [
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'ao-type', value: 'message' }
      // { name: 'Forwarded-For', value: 'jshaws-process' }
    ],
    data: 'This is the `contents` being communicated!'
  }

  message.tags.push({ name: 'function', value: expr })

  return message
}
