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
          { name: 'App-Name', value: 'SmartWeaveContract' },
          { name: 'App-Version', value: '0.3.0' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'Init-State', value: JSON.stringify({ initial: 'state' }) },
          { name: 'Contract-Src', value: 'src-id-123' },
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
      initialState: { initial: 'state' },
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
          { name: 'App-Name', value: 'SmartWeaveContract' },
          { name: 'App-Version', value: '0.3.0' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'Init-State', value: JSON.stringify({ initial: 'state' }) },
          { name: 'Contract-Src', value: 'src-id-123' },
          { name: 'SDK', value: 'ao' }
        ])

        return { res: 'foobar', contractId: 'contract-id-123' }
      },
      registerContract: async ({ contractId }) => ({ contractId }),
      logger
    })

    await uploadContract({
      srcId: 'src-id-123',
      initialState: { initial: 'state' },
      signer: async () => ({ id: 'contract-id-123', raw: 'raw-buffer' })
    }).toPromise()
  })
})
