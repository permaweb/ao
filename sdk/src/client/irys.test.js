import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployContractSchema, signerSchema } from '../dal.js'
import { deployContractWith } from './irys.js'

const IRYS_NODE = globalThis.IRYS_NODE || 'node2'
const logger = createLogger('@permaweb/ao-sdk:createContract')

describe('irys', () => {
  describe('deplyContractsWith', () => {
    test('sign and deploy the contract, and return the id', async () => {
      const deployContract = deployContractSchema.implement(
        deployContractWith({
          IRYS_NODE,
          logger,
          fetch: async (url, options) => {
            assert.strictEqual(url, `https://${IRYS_NODE}.irys.xyz/tx/arweave`)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              },
              body: 'raw-buffer'
            })

            return new Response(JSON.stringify({ id: 'contract-id-123', foo: 'bar' }))
          }
        })
      )

      const res = await deployContract({
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

      assert.deepStrictEqual(res, {
        res: { id: 'contract-id-123', foo: 'bar' },
        contractId: 'contract-id-123'
      })
    })
  })
})
