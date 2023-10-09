const fs = require('fs')
const path = require('path')

globalThis.MU_URL = 'http://localhost:3004'
globalThis.CU_URL = 'http://localhost:3005'
const { writeInteraction, createDataItemSigner } = require('@permaweb/ao-sdk')

const CONTRACT_TX_ID = '9kmXKsTm6BAbKGhgBfah373KCBu9YmM87-BgXmXyiLI';

(async function () {
  console.log('Testing ao...')

  const walletPath = process.env.PATH_TO_WALLET

  const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))
  const signer = createDataItemSigner(walletKey)

  const input = {
    function: 'eval',
    data: "return sendMsg('xgC8S_wWnBaT5ajTrK1ZYZR7gOI5kScp7_Q5cR1RVwM', 'this is your message')"
  }

  const tags = []

  await writeInteraction({
    contractId: CONTRACT_TX_ID,
    input,
    signer,
    tags
  })
})()
