import { readFileSync } from 'node:fs'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

const {
  spawnProcess
} = connect({
  GATEWAY_URL: "https://arweave.net", 
  MU_URL: "http://localhost:3004",
  CU_URL: "http://localhost:6363",
  SU_URL: "http://localhost:9000"
});

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

await spawnProcess({
  srcId: 'V4Z_o704ILkjFX6Dy93ycoKerywfip94j07dRjxMCPs',
  tags: [
    { name: 'Scheduled-Interval', value: '1-hour' },
    {
      name: 'Scheduled-Message',
      value: JSON.stringify({
        tags: [{ name: 'function', value: 'hello' }]
      })
    }
  ],
  signer: createDataItemSigner(wallet)
}).then(console.log)
  .catch(console.error)
