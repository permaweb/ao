import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployMessageSchema, signerSchema } from '../dal.js'
import { deployMessageWith } from './ao-mu.js'

const MU_URL = globalThis.MU_URL || 'https://ao-mu-1.onrender.com'
const logger = createLogger('@permaweb/ao-sdk:readState')

describe('ao-mu', () => {
  describe('deployMessageWith', () => {
    test('sign and deploy the message, and return the id', async () => {
      const deployMessage = deployMessageSchema.implement(
        deployMessageWith({
          MU_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, `${MU_URL}/message`)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: 'raw-buffer'
            })

            return new Response(JSON.stringify({ message: 'foobar' }))
          }
        })
      )

      const res = await deployMessage({
        processId: 'contract-asdf',
        data: 'data-123',
        signer: signerSchema.implement(
          async ({ data, tags }) => {
            assert.ok(data)
            assert.deepStrictEqual(tags, [
              { name: 'foo', value: 'bar' },
              { name: 'Content-Type', value: 'text/plain' }
            ])

            return { id: 'data-item-123', raw: 'raw-buffer' }
          }
        ),
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'Content-Type', value: 'text/plain' }
        ]
      })

      assert.deepStrictEqual(res, {
        res: { message: 'foobar' },
        messageId: 'data-item-123'
      })
    })
  })
})
