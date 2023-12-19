import { readFileSync } from 'node:fs'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

const { spawn } = connect({ MU_URL: 'http://localhost:3004' })

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString());

(async function () {
  const r = await spawn({
    module: '6xSB_-rcVEc8znlSe3JZBYHRsFw5lcgjhLyR8b6leLA',
    scheduler: 'lCA-1KVTuBxbUgUyeT_50tzrt1RZkiEpY-FFDcxmvps',
    tags: [

    ],
    signer: createDataItemSigner(wallet)
  })

  console.log(r)
})()
