const fs = require('fs')
const path = require('path')

globalThis.MU_URL = 'http://localhost:3004';
const { createDataItemSigner, writeMessage } = require("@permaweb/ao-sdk");

const PROCESS_ID = '1nBRvN1Uww3tuqD9KuLIfGpR1bjFF6Fi48tgOWvm1R0';

(async function () {
  console.log('Testing ao...')

  const walletPath = process.env.PATH_TO_WALLET

  const wallet = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

  try {
    await writeMessage({
      processId: PROCESS_ID,
      tags: [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'ao-type', value: 'message' },
        { name: 'function', value: 'eval' },
        { name: 'expression', value: 'return send("PROCESS_TO", { body = "Hello World"})' }
      ],
      signer: createDataItemSigner(wallet)
    }).then(console.log)
      .catch(console.error)
  } catch (err) {
    console.log('Error:', err)
    process.exit(0)
  }
})()