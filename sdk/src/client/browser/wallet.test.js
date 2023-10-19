import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createDataItemSigner } from './wallet.js'

describe('browser - wallet', () => {
  describe('createDataItemSigner', () => {
    test('should create and sign the data item', async () => {
      /**
       * A mock of an actual arweaveWallet pulled from
       * globalThis or window
       *
       * We only stub signDataItem because it's the only
       * api needed for the trimmed down InjectedArweaveSigner
       */
      const stubArweaveWallet = {
        async signDataItem ({ data, tags }) {
          return Buffer.from(JSON.stringify({ data, tags }))
        }
      }

      const sign = createDataItemSigner(stubArweaveWallet)

      const res = await sign({
        data: 'foobar',
        tags: [{ name: 'foo', value: 'bar' }],
        /**
         * stub createDataItem
         */
        createDataItem (buf) {
          return {
            id: Promise.resolve('CPUgRQCmNxVnIVyfC69_ypDaMQTYNOU8jsMad4QFAS8'),
            getRaw: async () => buf
          }
        }
      })

      console.log('signedDataItem', res)
      assert.ok(res.id)
      assert.ok(res.raw)
    })
  })
})
