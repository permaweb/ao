import { readFileSync } from 'node:fs'

import { spawn, createDataItemSigner } from '@permaweb/ao-sdk'

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

await spawn({
  module: 'V4Z_o704ILkjFX6Dy93ycoKerywfip94j07dRjxMCPs',
  tags: [
    { name: 'Cron-Interval', value: '1-hour' },
    { name: 'Cron-Tag-function', value: 'hello' }
  ],
  signer: createDataItemSigner(wallet)
}).then(console.log)
  .catch(console.error)
