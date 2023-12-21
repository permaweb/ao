import { readFileSync } from 'node:fs'

import WarpArBundles from 'warp-arbundles'
const { createData, ArweaveSigner } = WarpArBundles;

(async function () {
  const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())
  const signer = new ArweaveSigner(wallet)

  const data2 = Math.random().toString().slice(-4)
  const tags2 = [
    { name: 'Data-Protocol', value: 'ao' },
    { name: 'Type', value: 'Scheduler-Location' },
    { name: 'Url', value: 'https://ao-su-1.onrender.com' },
    { name: 'Time-To-Live', value: '86400000' }
  ]

  const dataItem2 = createData(data2, signer, { tags: tags2 })
  await dataItem2.sign(signer)

  const response2 = await fetch(
    'https://up.arweave.net/tx/arweave',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json'
      },
      body: dataItem2.getRaw()
    }
  )

  const responseText2 = await response2.text()
  // const processId = await dataItem2.id
  console.log(await dataItem2.id)
  console.log('Su Spawn Response 1 for Contract 1')
  console.log(responseText2)
})()
