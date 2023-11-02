import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployProcessWith, loadProcessMetaWith } from './ao-su.js'
import { deployProcessSchema, loadProcessMetaSchema, signerSchema } from '../dal.js'

const SU_URL = globalThis.SU_URL || 'https://su.foo'
const logger = createLogger('@permaweb/ao-sdk:createProcess')

describe('ao-su', () => {
  describe('deployProcessWith', () => {
    test('register the contract, and return the id', async () => {
      const deployProcess = deployProcessSchema.implement(
        deployProcessWith({
          SU_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, `${SU_URL}/process`)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              },
              body: 'raw-buffer'
            })

            return new Response(JSON.stringify({ foo: 'bar' }))
          }
        })
      )

      await deployProcess({
        data: '1234',
        tags: [{ name: 'foo', value: 'bar' }],
        signer: signerSchema.implement(
          async ({ data, tags }) => {
            assert.ok(data)
            assert.deepStrictEqual(tags, [
              { name: 'foo', value: 'bar' }
            ])
            return { id: 'data-item-123', raw: 'raw-buffer' }
          }
        )
      })
    })
  })

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
          SU_URL,
          fetch: async (url) => {
            assert.equal(url, `${SU_URL}/processes/uPKuZ6SABUXvgaEL3ZS3ku5QR1RLwE70V6IUslmZJFI`)
            return new Response(JSON.stringify({ tags }))
          }
        }))

      const res = await loadProcessMeta('uPKuZ6SABUXvgaEL3ZS3ku5QR1RLwE70V6IUslmZJFI')

      assert.deepStrictEqual(res, { tags })
    })
  })
})
