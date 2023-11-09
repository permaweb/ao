import { readFileSync } from 'node:fs'

import { writeMessage, createDataItemSigner } from '@permaweb/ao-sdk'

const PROCESS_ID = process.env.PROCESS_ID

if (!PROCESS_ID) throw new Error('PROCESS_ID env var is required, so as to know which process is receiving the message')

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

await writeMessage({
  processId: PROCESS_ID,
  tags: [
    { name: 'Data-Protocol', value: 'ao' },
    { name: 'function', value: 'raw' }
  ],
  signer: createDataItemSigner(wallet)
}).then(console.log)
  .catch(console.error)
