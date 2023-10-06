import { execSync } from "child_process"
import { Rejected, fromPromise, of, Resolved } from "hyper-async"
import NodeBundlr from "@bundlr-network/client/build/esm/node/bundlr"
import { createContract, createDataItemSigner } from "@permaweb/ao-sdk"
import { readFileSync } from "fs"

// run ao build
async function main() {
  if (!process.env.PATH_TO_WALLET) {
    console.error("Set PATH_TO_WALLET to your keyfile to run this script.")
    process.exit()
  }
  const jwk = JSON.parse(readFileSync(process.env.PATH_TO_WALLET, "utf-8"))
  const signer = () => createDataItemSigner(jwk)
  const bundlr = new NodeBundlr("https://node2.bundlr.network", "arweave", jwk)
  return (
    of(undefined)
      // .chain(() => fromPromise(build)("receiver"))
      // .chain(() => fromPromise(build)("sender"))
      .chain(() => fromPromise(publish)({ name: "receiver", bundlr }))
      .chain(fromPromise(waitForOneSecond))
      .chain(({ tx }) =>
        fromPromise(create)({
          signer,
          name: "receiver",
          srcTx: tx,
          extraState: {},
        })
      )
      .chain(({ tx }) => fromPromise(publishSender)({ bundlr, receiver: tx }))
      .chain(fromPromise(waitForOneSecond))
      .chain(({ tx, receiver }) =>
        fromPromise(create)({
          signer,
          name: "sender",
          srcTx: tx,
          extraState: { receiverTx: receiver },
        })
      )
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
  )
}

async function build(name) {
  try {
    console.log(`${name}: building.`)
    execSync(`(cd ${name} && ao build)`)
    console.log(`${name}: built.`)
    return Resolved()
  } catch (error) {
    return Rejected(`Error executing command: ${error}`)
  }
}

/**
 * @typedef {Object} PublishInput
 * @property {NodeBundlr} bundlr - bundlr module.
 * @property {string} name - name of the contract
 *
 * @author @jshaw-ar
 * @param {PublishInput} options
 * @return {*}
 */
async function publish({ name, bundlr }) {
  console.log(`${name}: publishing.`)
  // Upload with bundlr
  const tags = [
    {
      name: "Content-Type",
      value: "application/wasm",
    },
    {
      name: "App-Name",
      value: "SmartWeaveContractSource",
    },
    {
      name: "App-Version",
      value: "0.4.0",
    },
    {
      name: "Content-Type",
      value: "application/wasm",
    },
    {
      name: "Contract-Type",
      value: "ao",
    },
  ]

  const response = await bundlr.uploadFile(`${name}/contract.wasm`, {
    tags,
  })

  return {
    tx: response.id,
  }
}

/**
 * @typedef {Object} PublishInput
 * @property {NodeBundlr} bundlr - bundlr module.
 * @property {string} name - name of the contract
 *
 * @author @jshaw-ar
 * @param {PublishInput} options
 * @return {*}
 */
async function publishSender({ bundlr, receiver }) {
  console.log("Receiver", receiver)
  const { tx } = await publish({ name: "sender", bundlr })
  console.log("RESULT", tx)
  return { tx, receiver }
}

async function create({ srcTx, name, extraState, signer }) {
  console.log(`creating ${name}`, srcTx)
  console.log(
    `name: ${name} -- extraState: ${JSON.stringify(
      extraState
    )} -- name: ${name}`
  )
  const state = JSON.parse(readFileSync(`./${name}/state.json`, "utf-8"))
  const newExtraState = extraState ? extraState : {}
  const newState = {
    ...state,
    ...newExtraState,
  }
  console.log("State", JSON.stringify(state))
  const result = await createContract(srcTx, newState, signer(), [])
  return { tx: result }
}

async function waitForOneSecond(input) {
  console.log("Waiting a second")
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(input)
    }, 1000) // 1000 milliseconds = 1 second
  })
}

main()
