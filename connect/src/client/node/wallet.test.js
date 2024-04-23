import { describe, test, before } from 'node:test'
import * as assert from 'node:assert'
import { tmpdir } from 'node:os'
import { writeFileSync, readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

import Arweave from 'arweave'

import { createDataItemSigner } from './wallet.js'

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
  })
})
