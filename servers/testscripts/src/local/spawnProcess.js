import { readFileSync } from 'node:fs'

import WarpArBundles from 'warp-arbundles'
const { createData, ArweaveSigner } = WarpArBundles;

(async function () {
  const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())
  const data = Math.random().toString().slice(-4)
  const tags = [
    { name: 'Scheduler', value: 'mx8zvkz0jWNwAiBnBqkGcZqqfcFYptbrL4RIKMd4anc' },
    { name: 'Contract-Src', value: 'V4Z_o704ILkjFX6Dy93ycoKerywfip94j07dRjxMCPs' }
  ]

  const signer = new ArweaveSigner(wallet)
  const dataItem = createData(data, signer, { tags })
  await dataItem.sign(signer)

  const response = await fetch(
    'http://localhost:3004/spawn',
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
  console.log('MU Response 1 for Contract 1')
  console.log(responseText)
})()
