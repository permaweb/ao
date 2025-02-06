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

describe('index - node', () => {
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

      const { spawn, message, result, createDataItemSigner } = connect.hb({
        wallet,
        URL: process.env.HB_URL || 'http://localhost:8734'
      })

      const p = await spawn({
        module: 'bkjb55i07GUCUSWROtKK4HU1mBS_X0TyH3M5jMV6aPg',
        scheduler: 'tqHKJRbJWk1vD1Petwza-LMpV8H2XLXagjhWy11A2Sc',
        data: 'Foo = "bar"',
        tags: [
          { name: 'Foo', value: 'Bar' }
        ],
        signer: createDataItemSigner()
      }).then(tap(console.log))

      // const m = await message({
      //   process: p,
      //   anchor: 'foobar',
      //   tags: [
      //     { name: 'Action', value: 'Eval' },
      //     { name: 'Data-Protocol', value: 'ao' },
      //     { name: 'Variant', value: 'ao.TN.1' },
      //     { name: 'Type', value: 'Message' }
      //   ],
      //   data: "hello('bg')",
      //   signer: createDataItemSigner()
      // }).then(tap(console.log))

      // const r = await result({ id: m, process: p })
      //   .then(tap(console.log)).catch(console.error)
    })
  })
})
