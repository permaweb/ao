import { readFileSync } from 'node:fs'

import WarpArBundles from 'warp-arbundles'
const { createData, ArweaveSigner } = WarpArBundles;

(async function () {
  const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())
  const data = Math.random().toString().slice(-4)
  const tags = []

  const signer = new ArweaveSigner(wallet)
  const dataItem = createData(data, signer, { tags, target: 'xvcgB3kZwGqhgT4NUg9Uq7sxewQmuWPBC29ye76ZieI' })
  await dataItem.sign(signer)

  const response = await fetch(
    'http://localhost:8000/message',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json'
      },
      body: dataItem.getRaw()
    }
  )

  const responseText = await response.text()
  console.log('Su Response 1 for Contract 1')
  console.log(responseText)
})()
