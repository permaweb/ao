/* eslint-disable no-unused-vars */
import { describe, test, before, after } from 'node:test'
import * as assert from 'node:assert'
import { tmpdir } from 'node:os'
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

import Arweave from 'arweave'

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

  after(async () => {
    unlinkSync(tmpWallet)
  })

  describe('modes', () => {
    test('should return apis in the specified mode', async () => {
      const wallet = JSON.parse(readFileSync(tmpWallet).toString())

      assert.equal(
        connect({ MODE: 'legacy' }).MODE,
        'legacy'
      )

      assert.equal(
        connect({ MODE: 'relay', wallet }).MODE,
        'relay'
      )

      assert.equal(
        connect({ MODE: 'mainnet', wallet }).MODE,
        'mainnet'
      )
    })
  })
})
