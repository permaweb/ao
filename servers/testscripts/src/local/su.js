import { readFileSync } from 'node:fs'

import WarpArBundles from 'warp-arbundles'
const { createData, ArweaveSigner } = WarpArBundles;

(async function () {
  const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())
  const signer = new ArweaveSigner(wallet)

  const data2 = Math.random().toString().slice(-4)
  const tags2 = [
    { name: 'Data-Protocol', value: 'ao' },
    { name: 'Type', value: 'Process' },
    { name: 'Module', value: 'V4Z_o704ILkjFX6Dy93ycoKerywfip94j07dRjxMCPs' },
    { name: 'Scheduler', value: 'mx8zvkz0jWNwAiBnBqkGcZqqfcFYptbrL4RIKMd4anc' }
  ]

  const dataItem2 = createData(data2, signer, { tags: tags2 })
  await dataItem2.sign(signer)

  const response2 = await fetch(
    'http://localhost:9000/',
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
  const processId = await dataItem2.id
  console.log(await dataItem2.id)
  console.log('Su Spawn Response 1 for Contract 1')
  console.log(responseText2)

  const data = Math.random().toString().slice(-4)
  const tags = [
    { name: 'Data-Protocol', value: 'ao' },
    { name: 'Type', value: 'Message' },
    { name: 'Test', value: 'test' }
  ]

  const dataItem = createData(data, signer, { tags, target: processId })
  await dataItem.sign(signer)

  const response = await fetch(
    'http://localhost:9000/',
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
  console.log(await dataItem.id)
  console.log('Su MessageResponse 1 for Contract 1')
  console.log(responseText)

  const data3 = Math.random().toString().slice(-4)
  const tags3 = [
    { name: 'Data-Protocol', value: 'ao' },
    { name: 'Type', value: 'Message' },
    { name: 'Test', value: 'test' }
  ]

  const dataItem3 = createData(data3, signer, { tags: tags3, target: processId })
  await dataItem3.sign(signer)

  const response3 = await fetch(
    'http://localhost:9000/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json'
      },
      body: dataItem3.getRaw()
    }
  )

  const responseText3 = await response3.text()
  console.log(await dataItem3.id)
  console.log('Su MessageResponse 2 for Contract 1')
  console.log(responseText3)
})()
