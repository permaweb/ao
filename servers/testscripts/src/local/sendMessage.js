import { readFileSync } from 'node:fs'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

const PROCESS_ID = process.env.PROCESS_ID

if (!PROCESS_ID) throw new Error('PROCESS_ID env var is required, so as to know which process is receiving the message')

console.log(process.env.PATH_TO_WALLET)

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

const { sendMessage } = connect({
  GATEWAY_URL: "https://arweave.net", 
  MU_URL: "http://localhost:3004",
  CU_URL: "http://localhost:6363",
  SU_URL: "http://localhost:9000"
})

await sendMessage({
  processId: 'S8zZ1KFStLB8fYMq7rB_XEwVl0mbeMlhg4RxiuFp6tU',
  tags: [
    { name: 'Data-Protocol', value: 'ao' },
    { name: 'function', value: 'raw' }
  ],
  signer: createDataItemSigner(wallet)
}).then(console.log)
  .catch(console.error)
