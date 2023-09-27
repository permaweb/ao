import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createAndSignWith, readWalletWith, walletExistsWith } from './wallet.js'

describe('browser - wallet', () => {
  describe('walletExistsWith', () => {
    test('should return whether arweaveWallet is defined', async () => {
      const walletExists = walletExistsWith()

      globalThis.arweaveWallet = 'foobar'
      await walletExists().then(assert.ok)

      delete globalThis.arweaveWallet
      await walletExists().then(res => assert.ok(!res))
    })
  })

  describe('readWalletWith', () => {
    test('should return arweaveWallet', async () => {
      const readWallet = readWalletWith()

      globalThis.arweaveWallet = 'foobar'
      await readWallet().then(wallet => assert.equal(wallet, 'foobar'))
    })
  })

  describe('createAndSignWith', () => {
    test('should create and sign the data item', async () => {
      const createAndSign = createAndSignWith({
        createDataItem (buf) {
          return {
            id: Promise.resolve('CPUgRQCmNxVnIVyfC69_ypDaMQTYNOU8jsMad4QFAS8'),
            getRaw: async () => buf
          }
        }
      })

      /**
     * A mock of an actual arweaveWallet pulled from
     * globalThis or window, using an implementation
     * that uses the JWKInterface to sign
     *
     * We only stub signDataItem because it's the only
     * api needed for the trimmed down InjectedArweaveSigner
     */
      const stubArweaveWallet = {
        async signDataItem ({ data, tags }) {
          return Buffer.from(JSON.stringify({ data, tags }))
        }
      }

      const res = await createAndSign({
        data: 'foobar',
        tags: [{ name: 'foo', value: 'bar' }],
        wallet: stubArweaveWallet
      })

      console.log('signedDataItem', res)
      assert.ok(res.id)
      assert.ok(res.raw)
    })
  })
})
