import readline from 'node:readline'
import fs from 'node:fs'

import AoLoader from '@permaweb/ao-loader'

const wasm = fs.readFileSync('./process.wasm')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const env = {
  Process: {
    Id: 'PROCESS_TEST',
    Owner: 'OWNER',
    Tags: [
      { name: 'Module', value: '6xSB_-rcVEc8znlSe3JZBYHRsFw5lcgjhLyR8b6leLA' }
    ]
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
      const { Memory, Output } = handle(state, message, env)
      if (Output) console.log(JSON.parse(Output))
      // Continue the REPL
      await repl(Memory)
    } catch (err) {
      console.log('Error:', err)
      process.exit(0)
    }
  })
}

repl(null)

async function createMessage (expr) {
  const message = {
    Owner: 'OWNER',
    Target: 'PROCESS',
    Tags: [
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Message' }
    ],
    Data: undefined
  }

  /**
   * Grab the raw data from arweave, base64 endode and add as
   * data within data
   */
  if (expr.startsWith('say')) {
    const [, txId] = expr.split(' ').map(s => s.trim())
    message.Tags.push(
      { name: 'function', value: 'say' },
      { name: 'Load', value: txId }
    )
    message.Data = await fetch(`https://arweave.net/raw/${txId}`)
      .then(res => res.arrayBuffer())
      .then(bytesToBase64)
      .then(data => ({ Data: data }))
  } else if (expr.startsWith('friend')) {
    message.Tags.push(
      { name: 'function', value: 'friend' },
      { name: 'extra-spawn-tag', value: 'this should reach the final process' }
    )
  } else if (expr.startsWith('ping')) {
    const [, friend] = expr.split(' ').map(s => s.trim())
    message.Tags.push(
      { name: 'function', value: 'ping' },
      { name: 'friend', value: friend }
    )
  } else if (expr.startsWith('pong')) {
    const [, friend] = expr.split(' ').map(s => s.trim())
    message.Tags.push(
      { name: 'function', value: 'pong' },
      { name: 'friend', value: friend }
    )
  } else {
    message.Tags.push({ name: 'function', value: expr })
  }

  return message
}
