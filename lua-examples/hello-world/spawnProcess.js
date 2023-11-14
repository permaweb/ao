import { readFileSync } from 'node:fs'

import { spawnProcess, createDataItemSigner } from '@permaweb/ao-sdk'

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

await spawnProcess({
  srcId: 'QU75imHrJN1bOnzlLvLVXiVcSr1EQgA4aLCQG5tvklY',
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
