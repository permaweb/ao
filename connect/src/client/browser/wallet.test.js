import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { randomBytes } from 'node:crypto'

import Arweave from 'arweave'

import { createDataItemBytes } from '../../lib/data-item.js'
import { DATAITEM_SIGNER_KIND } from '../signer.js'
import { createSigner } from './wallet.js'

describe('browser - wallet', () => {
  describe('createSigner', () => {
    test('should create and sign the data item', async () => {
      const arweave = Arweave.init()
      const wallet = await arweave.wallets.generate()
      const publicKey = Buffer.from(wallet.n, 'base64url')
      /**
       * A mock of an actual arweaveWallet pulled from
       * globalThis or window
       *
       * We only stub signDataItem because it's the only
       * api needed
       */
      const stubArweaveWallet = {
        async signDataItem ({ data, tags, target, anchor }) {
          /**
           * pretend actual signing is done here
           */
          const bytes = createDataItemBytes(data, { type: 1, publicKey }, { tags, target, anchor })
          return bytes
        }
      }

      const sign = createSigner(stubArweaveWallet)

      const res = await sign(
        async (args) => {
          assert.ok(args.passthrough)
          return {
            data: 'foobar',
            tags: [{ name: 'foo', value: 'bar' }],
            target: 'xwOgX-MmqN5_-Ny_zNu2A8o-PnTGsoRb_3FrtiMAkuw',
            anchor: randomBytes(32)
          }
        },
        DATAITEM_SIGNER_KIND
      )

      console.log('signedDataItem', res)
      assert.ok(res.id)
      assert.ok(res.raw)
    })
  })
})
