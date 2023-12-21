import { readFileSync } from 'node:fs'

import WarpArBundles from 'warp-arbundles'
const { createData, ArweaveSigner } = WarpArBundles;

(async function () {
  const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

  const data = Math.random().toString().slice(-4)
  const tags = []

  const signer = new ArweaveSigner(wallet)
  const dataItem = createData(data, signer, { tags, target: 'cY3fdWaymqe0JV1WcWvRhrsuz_z2JQMfX4nPlRn3qs8' })
  await dataItem.sign(signer)

  const response = await fetch(
    'http://localhost:3004/monitor/cY3fdWaymqe0JV1WcWvRhrsuz_z2JQMfX4nPlRn3qs8',
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
  console.log('Monitor Response 1 for Contract 2')
  console.log(responseText)
})()
