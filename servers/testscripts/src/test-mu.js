const fs = require('fs')
const path = require('path')

const WarpArBundles = require('warp-arbundles');

const { createData, ArweaveSigner } = WarpArBundles

const CONTRACT_TX_ID = 'uJFN44vrnt4aLb4hBtfBryY-2z3ag_Us-e896ZaJxHM';
const MU_URL = 'http://localhost:3005';

(async function () {
  console.log('Testing ao...')

  const walletPath = process.env.PATH_TO_WALLET

  const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

  const data = Math.random().toString().slice(-4)
  const tags = [
    { name: 'Contract', value: 'asdf' }
  ]

  const signer = new ArweaveSigner(walletKey)
  const dataItem = createData(data, signer, { tags, target: CONTRACT_TX_ID })
  await dataItem.sign(signer)

  const response = await fetch(
      `${MU_URL}/monitor/${CONTRACT_TX_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json'
        },
        body: dataItem.getRaw()
      }
  )

  const responseJson = await response.text()
  console.log(responseJson)

  
})()