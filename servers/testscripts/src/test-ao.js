const fs = require('fs')
const path = require('path')

const { ArweaveSigner } = require('warp-arbundles')

globalThis.MU_URL = 'http://localhost:3004'
globalThis.CU_URL = 'http://localhost:3005'
const { writeInteraction, readState } = require('@permaweb/ao-sdk')

const CONTRACT_TX_ID = 'tIkcmiXhFNcuu_CDTflIIWVwJ7sCmHR0Jt0x6m_jek8';
(async function () {
  console.log('Testing ao...')

  const walletPath = process.env.PATH_TO_WALLET

  const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))
  const signer = new ArweaveSigner(walletKey)

  const input = { function: 'noop' }
  const tags = []

  const s = await readState(CONTRACT_TX_ID)
  console.log(s)

  await writeInteraction(
    CONTRACT_TX_ID,
    input,
    signer,
    tags
  )

  // let newState = await fetch(`${CU_URL}${CONTRACT_ENDPOINT}${CONTRACT_TX_ID}`);
  // let newStateJson = await newState.json();

  // console.log(newStateJson);
})()
