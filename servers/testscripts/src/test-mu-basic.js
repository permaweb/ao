const fs = require('fs')
const path = require('path')

const WarpArBundles = require('warp-arbundles');

const { createData, ArweaveSigner } = WarpArBundles

const CONTRACT_TX_ID = 'cFB-UpcJ6biV_xzDM5R4VnOZ2GxWzb7-HBsmkeGM70Y';
const MU_URL = 'http://localhost:3005';

(async function () {
  console.log('Testing ao...')

  const walletPath = process.env.PATH_TO_WALLET

  const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

  const data = Math.random().toString().slice(-4)
  const tags = [
    { name: 'Data-Protocol', value: 'ao' },
    { name: 'ao-type', value: 'message' },
    { name: 'function', value: 'eval' },
    { name: 'expression', value: "return sendMsg('cFB-UpcJ6biV_xzDM5R4VnOZ2GxWzb7-HBsmkeGM70Y', 'this is your message')" }
  ]

  const signer = new ArweaveSigner(walletKey)
  const dataItem = createData(data, signer, { tags, target: CONTRACT_TX_ID })
  await dataItem.sign(signer)

  const response = await fetch(
      `${MU_URL}/message`,
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