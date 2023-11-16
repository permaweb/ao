import { readFileSync } from 'node:fs'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

const PROCESS_ID = process.env.PROCESS_ID
// hello-world wasm src
const SPAWN_SRC_ID = 'V4Z_o704ILkjFX6Dy93ycoKerywfip94j07dRjxMCPs';

if (!PROCESS_ID) throw new Error('PROCESS_ID env var is required, so as to know which process is receiving the message')

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

const { sendMessage } = connect()

// spawns another instance of hello-world
await sendMessage({
  processId: PROCESS_ID,
  tags: [
    { name: 'Data-Protocol', value: 'ao' },
    { name: 'function', value: 'friend' },
    { name: 'src-id', value: SPAWN_SRC_ID },
    { name: 'extra-spawn-tag', value: 'this should reach the final process' }
  ],
  signer: createDataItemSigner(wallet)
}).then(console.log)
  .catch(console.error)
