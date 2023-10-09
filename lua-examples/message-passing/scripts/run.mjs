import { Rejected, fromPromise, of, Resolved } from "hyper-async"
import { writeInteraction, createDataItemSigner } from "@permaweb/ao-sdk"
import { readFileSync } from "fs"

// run ao build
async function main(tx, crankTx) {
  if (!process.env.PATH_TO_WALLET) {
    console.error("Set PATH_TO_WALLET to your keyfile to run this script.")
    process.exit()
  }
  const jwk = JSON.parse(readFileSync(process.env.PATH_TO_WALLET, "utf-8"))
  const signer = () => createDataItemSigner(jwk)
  return of({ tx, signer })
    .chain(fromPromise(interact))
    .chain(fromPromise(crank)({ tx: crankTx }))
    .fork(
      (e) => {
        console.error(e)
        process.exit()
      },
      (input) => {
        console.log("Success")
        console.log(input)
      }
    )
}

async function interact({ tx, signer }) {
  const interactionId = await writeInteraction({
    contractId: tx,
    input: { function: "blah" },
    signer: signer(),
    tags: [],
  })
  return interactionId
}

async function crank({ tx }) {
  const MU_URL = "https://ao-mu-1.onrender.com"
  const CRANK_ENDPOINT = "/crank/"
  const CU_URL = "https://ao-cu-1.onrender.com"
  const crankResult = await fetch(`${MU_URL}${CRANK_ENDPOINT}${tx}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cu: CU_URL }),
  })

  let crankResultJson = await crankResult.json()

  console.log(crankResultJson)
}

main("aY_sRvvLZRg_uhC4fbHZtgZUQXv3yKthC1lzDtz29Ew")
