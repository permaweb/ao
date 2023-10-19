import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { uploadContractWith } from './upload-contract.js'

const logger = createLogger('createContract')

describe('upload-contract', () => {
  test('add the tags, sign, upload the contract, register the contract, and return the contractId', async () => {
    const uploadContract = uploadContractWith({
      deployContract: async ({ data, tags, signer }) => {
        assert.ok(data)
        assert.deepStrictEqual(tags, [
          { name: 'foo', value: 'bar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'ao-type', value: 'process' },
          { name: 'Contract-Src', value: 'src-id-123' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'SDK', value: 'ao' }
        ])
        assert.ok(signer)

        return { res: 'foobar', contractId: 'contract-id-123' }
      },
      registerContract: async ({ contractId }) => {
        assert.equal(contractId, 'contract-id-123')
        return { contractId }
      },
      logger
    })

    await uploadContract({
      srcId: 'src-id-123',
      tags: [
        { name: 'foo', value: 'bar' }
      ],
      signer: async () => ({ id: 'contract-id-123', raw: 'raw-buffer' })
    }).toPromise()
      .then(res => assert.equal(res.contractId, 'contract-id-123'))
  })

  test('defaults tags if none are provided', async () => {
    const uploadContract = uploadContractWith({
      deployContract: async ({ tags }) => {
        assert.deepStrictEqual(tags, [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'ao-type', value: 'process' },
          { name: 'Contract-Src', value: 'src-id-123' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'SDK', value: 'ao' }
        ])

        return { res: 'foobar', contractId: 'contract-id-123' }
      },
      registerContract: async ({ contractId }) => ({ contractId }),
      logger
    })

    await uploadContract({
      srcId: 'src-id-123',
      signer: async () => ({ id: 'contract-id-123', raw: 'raw-buffer' })
    }).toPromise()
  })

  test('deduplicates identifying tags', async () => {
    const uploadContract = uploadContractWith({
      deployContract: async ({ tags }) => {
        assert.deepStrictEqual(tags, [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'ao-type', value: 'process' },
          { name: 'Contract-Src', value: 'src-id-123' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'SDK', value: 'ao' }
        ])

        return { res: 'foobar', contractId: 'contract-id-123' }
      },
      registerContract: async ({ contractId }) => ({ contractId }),
      logger
    })

    await uploadContract({
      srcId: 'src-id-123',
      tags: [
        { name: 'ao-type', value: 'process' },
        { name: 'ao-type', value: 'process' },
        { name: 'Contract-Src', value: 'oops-duplicate' }
      ],
      signer: async () => ({ id: 'contract-id-123', raw: 'raw-buffer' })
    }).toPromise()
  })
})
