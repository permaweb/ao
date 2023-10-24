import { readFileSync } from 'node:fs'
import readline from 'node:readline'

/**
 * This scrupt uses the local SDK build, so make sure to run `npm run build` in '/sdk'
 */
import { writeMessage, createDataItemSigner } from '../../sdk/dist/index.js'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
 * Use this script to create write a message to an AOS process
 *
 * You will need to set PROCESS_ID to whatever process you're targeting
 */

const PROCESS_ID = process.env.PROCESS_ID

if (!PROCESS_ID) throw new Error('PROCESS_ID env var is required, so as to know which process is receiving the message')

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

rl.question('aos> ', async function (line) {
  // Exit the REPL if the user types "exit"
  if (line === 'exit') {
    console.log('Exiting...')
    rl.close()
    return
  }

  try {
    await writeMessage({
      processId: PROCESS_ID,
      tags: [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'ao-type', value: 'message' },
        { name: 'function', value: 'eval' },
        { name: 'expression', value: line }
      ],
      signer: createDataItemSigner(wallet)
    }).then(console.log)
      .catch(console.error)
  } catch (err) {
    console.log('Error:', err)
    process.exit(0)
  }
})
