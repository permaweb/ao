import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { Resolved } from 'hyper-async'

import { createLogger } from '../../logger.js'
import { uploadContractWith } from './upload-contract.js'

const logger = createLogger('createContract')

describe('upload-contract', () => {
  test('add the tags, sign, upload the contract, and return the contractId', async () => {
    const uploadContract = uploadContractWith({
      deployContract: ({ data, tags, signer }) => {
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

        return Resolved({ contractId: 'contract-id-123' })
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
})
