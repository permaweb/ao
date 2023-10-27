import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { registerProcessSchema } from '../dal.js'
import { registerProcessWith } from './ao-su.js'

const SU_URL = globalThis.SU_URL || 'https://su.foo'
const logger = createLogger('@permaweb/ao-sdk:createProcess')

describe('ao-su', () => {
  describe('registerContractWith', () => {
    test('register the contract, and return the id', async () => {
      const registerProcess = registerProcessSchema.implement(
        registerProcessWith({
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

      await registerProcess({ id: 'process-123', raw: 'raw-buffer' })
    })
  })
})
