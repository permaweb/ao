import { readFileSync } from 'node:fs'

import { createProcess, createDataItemSigner } from '@permaweb/ao-sdk'

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

await createProcess({
  srcId: 'IKZzFN5JvCf3XCOx1kw940sjY9zAbsd6Wm7MMRgf_Zk',
  tags: [
    { name: 'Scheduled-Interval', value: '5-minutes' },
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
