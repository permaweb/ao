import { fromPromise, of } from 'hyper-async'
import { writeInteraction, createDataItemSigner } from '@permaweb/ao-sdk'
import { readFileSync } from 'fs'
globalThis.MU_URL = 'http://localhost:3004'
globalThis.CU_URL = 'http://localhost:3005'

// run ao build
async function main (tx) {
  if (!process.env.PATH_TO_WALLET) {
    console.error('Set PATH_TO_WALLET to your keyfile to run this script.')
    process.exit()
  }
  const jwk = JSON.parse(readFileSync(process.env.PATH_TO_WALLET, 'utf-8'))
  const signer = () => createDataItemSigner(jwk)
  return of({ tx, signer })
    .chain(fromPromise(interact))
    .chain(fromPromise(waitForOneSecond))
    .fork(
      (e) => {
        console.error(e)
        process.exit()
      },
      (input) => {
        console.log('Success')
        console.log(input)
      }
    )
}
async function waitForOneSecond (input) {
  const num = 2
  console.log(`Waiting ${num} second(s).`)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(input)
    }, num * 1000) // 1000 milliseconds = 1 second
  })
}
async function interact ({ tx, signer }) {
  const interactionId = await writeInteraction({
    contractId: tx,
    input: { function: 'blah' },
    signer: signer(),
    tags: []
  })
  return interactionId
}

if (process.env.SENDER) {
  console.log(
    'Please run the command like this `SENDER=<tx> node ./scriipts/launch.mjs`'
  )
}

main(process.env.SENDER)
