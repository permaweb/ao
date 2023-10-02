import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployInteractionSchema, signerSchema } from '../dal.js'
import { deployInteractionWith } from './ao-mu.js'

const MU_URL = globalThis.MU_URL || 'https://ao-mu-1.onrender.com'
const logger = createLogger('@permaweb/ao-sdk:readState')

describe('ao-mu', () => {
  describe('deployInteractionWith', () => {
    test('sign and deploy the contract, and return the id', async () => {
      const deployInteraction = deployInteractionSchema.implement(
        deployInteractionWith({
          MU_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, `${MU_URL}/write`)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify({
                cid: 'contract-asdf',
                txid: 'data-item-123',
                data: 'raw-buffer'
              })
            })

            return new Response(JSON.stringify({ message: 'foobar' }))
          }
        })
      )

      const res = await deployInteraction({
        contractId: 'contract-asdf',
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
        interactionId: 'data-item-123'
      })
    })
  })
})
