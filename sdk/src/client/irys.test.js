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
          NodeIrys: class StubNodeIrys {
            constructor ({ url, token, key }) {
              assert.strictEqual(url, IRYS_NODE)
              assert.strictEqual(token, 'arweave')
              assert.strictEqual(key, 'wallet-123')
            }

            async upload (data, { tags }) {
              assert.strictEqual(data, '1234')
              assert.deepStrictEqual(tags, [{ name: 'foo', value: 'bar' }])
              return { id: 'contract-id-123', foo: 'bar' }
            }
          }
        })
      )

      const mockSigner = async () => ({ id: 'data-item-123', raw: 'raw-buffer' })
      mockSigner._ = () => 'wallet-123'

      const res = await deployContract({
        data: '1234',
        tags: [{ name: 'foo', value: 'bar' }],
        signer: signerSchema.implement(mockSigner)
      })

      assert.deepStrictEqual(res, {
        res: { id: 'contract-id-123', foo: 'bar' },
        contractId: 'contract-id-123'
      })
    })
  })
})
