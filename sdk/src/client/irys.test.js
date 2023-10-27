import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployProcessSchema, signerSchema } from '../dal.js'
import { deployProcessWith } from './irys.js'

const IRYS_NODE = globalThis.IRYS_NODE || 'node2'
const logger = createLogger('@permaweb/ao-sdk:createProcess')

describe('irys', () => {
  describe('deployProcessWith', () => {
    test('sign and deploy the process, and return the id', async () => {
      const deployProcess = deployProcessSchema.implement(
        deployProcessWith({
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

            return new Response(JSON.stringify({ id: 'process-id-123', foo: 'bar' }))
          }
        })
      )

      const res = await deployProcess({
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
        res: { id: 'process-id-123', foo: 'bar' },
        processId: 'process-id-123',
        signedDataItem: { id: 'data-item-123', raw: 'raw-buffer' }
      })
    })
  })
})
