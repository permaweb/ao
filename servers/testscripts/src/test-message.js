const fs = require('fs')
const path = require('path')

globalThis.MU_URL = "http://localhost:3004"
globalThis.CU_URL = "http://localhost:6363"
globalThis.SU_URL = "http://localhost:9000"

const { createDataItemSigner, writeMessage } = require("@permaweb/ao-sdk")

const PROCESS_ID = 'PLlYObtosMR0IhAGtNnsybcVetDH8WOoyBKLveCvDO0';

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
        { name: 'expression', value: 'return send("8XaMBQMi_76qnj0631Io4UVgZql58D9rI6l2d4SYxNQ", { body = "Hello World"})' }
      ],
      signer: createDataItemSigner(wallet)
    }).then(console.log)
      .catch(console.error)
  } catch (err) {
    console.log('Error:', err)
    process.exit(0)
  }
})()