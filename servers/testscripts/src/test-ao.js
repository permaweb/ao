const fs = require("fs")
const path = require("path")

globalThis.MU_URL = "http://localhost:3004"
globalThis.CU_URL = "http://localhost:3005"
const { writeInteraction, createDataItemSigner } = require("@permaweb/ao-sdk")

const CONTRACT_TX_ID = "uJFN44vrnt4aLb4hBtfBryY-2z3ag_Us-e896ZaJxHM"
;(async function () {
  console.log("Testing ao...")

  const walletPath = process.env.PATH_TO_WALLET

  const walletKey = JSON.parse(
    fs.readFileSync(path.resolve(walletPath), "utf8")
  )
  const signer = createDataItemSigner(walletKey)

  const input = { function: "noop" }
  const tags = []

  await writeInteraction({
    contractId: CONTRACT_TX_ID,
    input,
    signer,
    tags,
  })
})()
