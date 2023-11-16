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

/**
 * Converts an arraybuffer into base64, also handling
 * the Unicode Problem: https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
 */
function bytesToBase64 (bytes) {
  return Buffer.from(bytes).toString('base64')
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
      const message = await createMessage(line)
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

async function createMessage (expr) {
  const message = {
    owner: 'OWNER',
    target: 'PROCESS',
    tags: [
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'ao-type', value: 'message' }
    ],
    data: undefined
  }

  /**
   * Grab the raw data from arweave, base64 endode and add as
   * data within data
   */
  if (expr.startsWith('say')) {
    const [, txId] = expr.split(' ').map(s => s.trim())
    expr = 'say'
    message.tags.push(
      { name: 'function', value: 'say' },
      { name: 'ao-load', value: txId }
    )
    message.data = await fetch(`https://arweave.net/raw/${txId}`)
      .then(res => res.arrayBuffer())
      .then(bytesToBase64)
      .then(data => ({ data }))
  } else {
    message.tags.push({ name: 'function', value: expr })
  }

  return message
}
