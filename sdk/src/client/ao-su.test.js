import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployProcessWith } from './ao-su.js'
import { deployProcessSchema, signerSchema } from '../dal.js'

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
})
