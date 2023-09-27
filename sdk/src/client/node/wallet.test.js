import { describe, test, before } from 'node:test'
import * as assert from 'node:assert'
import { tmpdir } from 'node:os'
import { writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

import Arweave from 'arweave'

import { createAndSignWith, readWalletWith, walletExistsWith } from './wallet.js'

describe('browser - wallet', () => {
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

  describe('walletExistsWith', () => {
    test('should return whether arweaveWallet is defined', async () => {
      const walletExists = walletExistsWith()
      await walletExists(tmpWallet).then(assert.ok)

      await walletExists('./dne.json').then(res => assert.ok(!res))
    })
  })

  describe('readWalletWith', () => {
    test('should return arweaveWallet', async () => {
      const readWallet = readWalletWith()
      await readWallet(tmpWallet).then(wallet => assert.equal(wallet.kty, 'RSA'))
    })
  })

  describe('createAndSignWith', () => {
    const readWallet = readWalletWith()

    test('should create and sign the data item', async () => {
      const wallet = await readWallet(tmpWallet)

      const createAndSign = createAndSignWith()

      const res = await createAndSign({
        data: 'foobar',
        tags: [{ name: 'foo', value: 'bar' }],
        wallet
      })

      console.log('signedDataItem', res)
      assert.ok(res.id)
      assert.ok(res.raw)
    })
  })
})
