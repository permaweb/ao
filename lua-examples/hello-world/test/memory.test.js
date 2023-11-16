import fs from 'node:fs'
import AoLoader from '@permaweb/ao-loader'
import 'heapdump'

/**
 * To trigger a heap dump, into the CWD, execute
 * > kill -USR2 <pid>
 */
console.log(process.pid)
const wasm = fs.readFileSync('../process.wasm')

async function load (state, message, env) {
  const handle = await AoLoader(wasm)
  const { buffer, output } = handle(state, message, env)
  if (output) console.log(JSON.parse(output))
  return buffer
}

function createMessage (expr) {
  const message = {
    owner: 'OWNER',
    target: 'PROCESS',
    tags: [
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'ao-type', value: 'message' },
      { name: 'function', value: expr }
    ],
    data: undefined
  }

  return message
}

let buffer
for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
  buffer = await load(
    buffer,
    createMessage(i % 5 === 0 ? 'raw' : 'hello'),
    {
      process: {
        id: 'PROCESS_TEST',
        owner: 'OWNER'
      }
    }
  )

  await new Promise(resolve => setTimeout(resolve, 500))
}
