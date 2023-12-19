import { readFileSync } from 'node:fs'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

const { spawn } = connect()

await spawn({
  module: 'HVrC6zGchfLPgfNda2yBRzGulGzGPeuLRIq-H7qBcPY',
  scheduler: 'TZ7o7SIZ06ZEJ14lXwVtng1EtSx60QkPy-kh-kdAXog',
  tags: [
    { name: 'Cron-Interval', value: '1-hour' },
    { name: 'Cron-Tag-function', value: 'hello' }
  ],
  signer: createDataItemSigner(wallet)
}).then(console.log)
  .catch(console.error)
