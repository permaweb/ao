// const fs = require('fs')
// const path = require('path')

// globalThis.MU_URL = 'http://localhost:3004'
// globalThis.CU_URL = 'http://localhost:3005'
// const { createDataItemSigner } = require('@permaweb/ao-sdk')

// const CONTRACT_TX_ID = 'uJFN44vrnt4aLb4hBtfBryY-2z3ag_Us-e896ZaJxHM'
// const SEQUENCER_URL = 'http://localhost:9000'

// (async function () {
//   console.log('Testing ao...')

//   const walletPath = process.env.PATH_TO_WALLET

//   const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))
//   const signer = createDataItemSigner(walletKey)

//   const input = { function: 'noop' }
//   const tags = []

//   const response = await fetch(
//       `${SEQUENCER_URL}/write`,
//       {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/octet-stream',
//           Accept: 'application/json'
//         },
//         body: rawDataBuffer
//       }
//   )

// })()
