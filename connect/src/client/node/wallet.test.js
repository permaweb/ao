import { describe, test, before } from 'node:test'
import * as assert from 'node:assert'
import { tmpdir } from 'node:os'
import { writeFileSync, readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

import Arweave from 'arweave'

import { createDataItemSigner, createEthereumDataItemSigner, createSolanaDataItemSigner } from './wallet.js'

describe('node - wallet', () => {
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

  describe('createDataItemSigner', () => {
    test('should create and sign the data item with Arweave signer', async () => {
      const wallet = JSON.parse(readFileSync(tmpWallet).toString())

      const signDataItem = createDataItemSigner(wallet)

      const res = await signDataItem({
        data: 'foobar',
        tags: [{ name: 'foo', value: 'bar' }],
        target: 'xwOgX-MmqN5_-Ny_zNu2A8o-PnTGsoRb_3FrtiMAkuw',
        anchor: randomBytes(32)
      })

      console.log('signedDataItem', res)
      assert.ok(res.id)
      assert.ok(res.raw)
    })

    test('should create and sign the data item with Ethereum signer', async () => {
      // const wallet = ethers.Wallet.createRandom().privateKey
      const wallet = '0x5cb525ddd4b766761a10526dadfa84816f1ff272ba52c29ae55b1c8ac734984b'

      const signDataItem = createEthereumDataItemSigner(wallet)

      const res = await signDataItem({
        data: 'foobar',
        tags: [{ name: 'foo', value: 'bar' }],
        target: 'xwOgX-MmqN5_-Ny_zNu2A8o-PnTGsoRb_3FrtiMAkuw',
        anchor: randomBytes(32)
      })

      console.log('signedDataItem', res)
      assert.ok(res.id)
      assert.ok(res.raw)
    })

    test('should create and sign the data item with Solana signer', async () => {
      // const wallet = b58.encode(SolanaWeb3.Keypair.generate().secretKey)
      const wallet = '37ku4b5nwE2KBxoMvvkUV8nhcGQj8hdfGcLcv81tEbQhopLnccPwsxJGZdYasyCjbBrZsaAaiCVaC2EJfSbSib6p'

      const signDataItem = createSolanaDataItemSigner(wallet)

      const res = await signDataItem({
        data: 'foobar',
        tags: [{ name: 'foo', value: 'bar' }],
        target: 'xwOgX-MmqN5_-Ny_zNu2A8o-PnTGsoRb_3FrtiMAkuw',
        anchor: randomBytes(32)
      })

      console.log('signedDataItem', res)
      assert.ok(res.id)
      assert.ok(res.raw)
    })
  })
})
