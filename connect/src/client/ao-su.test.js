import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { loadProcessMetaWith } from './ao-su.js'
import { loadProcessMetaSchema } from '../dal.js'

const SU_URL = globalThis.SU_URL || 'https://su.foo'

describe('ao-su', () => {
  describe('loadProcessMeta', () => {
    test('return the process meta', async () => {
      const tags = [
        {
          name: 'Contract-Src',
          value: 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
        },
        {
          name: 'SDK',
          value: 'ao'
        }
      ]

      const loadProcessMeta = loadProcessMetaSchema.implement(
        loadProcessMetaWith({
          fetch: async (url) => {
            assert.equal(url, `${SU_URL}/processes/uPKuZ6SABUXvgaEL3ZS3ku5QR1RLwE70V6IUslmZJFI`)
            return new Response(JSON.stringify({ tags }))
          }
        }))

      const res = await loadProcessMeta({
        suUrl: SU_URL,
        processId: 'uPKuZ6SABUXvgaEL3ZS3ku5QR1RLwE70V6IUslmZJFI'
      })

      assert.deepStrictEqual(res, { tags })
    })
  })
})
