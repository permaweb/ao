/* eslint-disable no-unused-vars */
import { describe, test, before } from 'node:test'
// import * as assert from 'node:assert'
import { tmpdir } from 'node:os'
import { writeFileSync, readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

import Arweave from 'arweave'
import { tap } from 'ramda'

import { connect } from './index.js'

describe('hb playground', () => {
  /**
   * Generate a wallet in a temporary directory prior to running the tests
   */
  let tmpWallet
  before(async () => {
    const arweave = Arweave.init()

    tmpWallet = join(tmpdir(), `${randomBytes(16).toString('hex')}.json`)
    writeFileSync(
      tmpWallet,
      JSON.stringify(await arweave.wallets.generate())
    )
  })

  describe('HyperBEAM mode', () => {
    test('should relay the message through HyperBEAM', async () => {
      const wallet = JSON.parse(readFileSync(tmpWallet).toString())

      const { request, spawn, message, result, createDataItemSigner } = connect({
        MODE: 'mainnet',
        wallet,
        device: 'process@1.0',
        URL: process.env.HB_URL || 'https://10000-permaweb-hbinfra-erkeu448sa9.ws-us117.gitpod.io'
      })

      const address = await fetch(process.env.HB_URL + '/~meta@1.0/info/address').then((res) => res.text())

      console.log(address)
      // uncomment examples as needed

      const res = await request(`~simple-pay@1.0/balance?address=${address}`, {
        method: 'GET'
      })

      // const p = await spawn({
      //   scheduler: address,
      //   module: 'bkjb55i07GUCUSWROtKK4HU1mBS_X0TyH3M5jMV6aPg',
      //   data: 'print("Process initialized.")',
      //   tags: [
      //     { name: 'device', value: 'process@1.0' },
      //     { name: 'scheduler-device', value: 'scheduler@1.0' },
      //     { name: 'execution-device', value: 'compute-lite@1.0' },
      //     { name: 'authority', value: address },
      //     { name: 'scheduler-location', value: address },
      //     { name: 'scheduler', value: address },
      //     { name: 'random-seed', value: randomBytes(16).toString('hex') }
      //   ],
      //   signer: createDataItemSigner()
      // }).then(tap(console.log))

      // const m = await message({
      //   process: p,
      //   tags: [
      //     { name: 'Action', value: 'Eval' },
      //     { name: 'Data-Protocol', value: 'ao' },
      //     { name: 'Variant', value: 'ao.TN.1' },
      //     { name: 'Type', value: 'Message' }
      //   ],
      //   data: "Send({ Target = ao.id, Data = 'gday mate' })",
      //   signer: createDataItemSigner()
      // }).then(tap(console.log))

      // console.log('READY TO LOAD RESULT. m:', m)

      // const r = await result({ message: m, process: p })
      //   .then(tap(console.log)).catch(console.error)
    })
  })
})
