import { readFileSync } from 'node:fs'

import { spawn, createDataItemSigner } from '@permaweb/ao-sdk'

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

await spawn({
  module: 'nnYHq4NRKsKl6eMBC3rGq_Gm_Ddx1FDjDdUKuWOVfG8',
  tags: [
    { name: 'Cron-Interval', value: '1-hour' },
    { name: 'Cron-Tag-function', value: 'hello' }
  ],
  signer: createDataItemSigner(wallet)
}).then(console.log)
  .catch(console.error)
