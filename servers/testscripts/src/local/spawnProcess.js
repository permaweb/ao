import { readFileSync } from 'node:fs'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

const { spawn } = connect({ MU_URL: 'https://ao-mu-1.onrender.com' })

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString());

(async function () {
  const r = await spawn({
    module: '6xSB_-rcVEc8znlSe3JZBYHRsFw5lcgjhLyR8b6leLA',
    scheduler: '4QKhXnyl1z3HEPprMKfTeXrWPRuQjK6O99k5SFKGuck',
    tags: [
      // { name: 'Cron-Interval', value: '5-minutes' },
      // { name: 'Cron-Tag-function', value: 'ping' },
      // { name: 'Cron-Tag-friend', value: '3CZkzbrEjA34oUY2DfQhMHgu90Ni253NF5KIrDXja3o' }
    ],
    signer: createDataItemSigner(wallet)
  })

  console.log(r)
  await new Promise(resolve => setTimeout(resolve, 15000))

  // await message({
  //   process: r,
  //   tags: [
  //     { name: 'function', value: 'ping' },
  //     { name: 'friend', value: '3CZkzbrEjA34oUY2DfQhMHgu90Ni253NF5KIrDXja3o' }
  //   ],
  //   signer: createDataItemSigner(wallet)
  // }).then(console.log)
  //   .catch(console.error)
})()
