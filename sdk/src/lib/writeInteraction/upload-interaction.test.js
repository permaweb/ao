import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { Resolved } from 'hyper-async'

import { uploadInteractionWith } from './upload-interaction.js'

describe('upload-interaction', () => {
  test('add the tafs, sign, and upload the interaction, and return the interactionId', async () => {
    const uploadInteraction = uploadInteractionWith({
      deployInteraction: ({ contractId, data, tags, signer }) => {
        assert.ok(data)
        assert.equal(contractId, 'contract-asdf')
        assert.deepStrictEqual(tags, [
          { name: 'foo', value: 'bar' },
          { name: 'App-Name', value: 'SmartWeaveAction' },
          { name: 'App-Version', value: '0.3.0' },
          { name: 'Contract', value: 'contract-asdf' },
          { name: 'Input', value: JSON.stringify({ function: 'noop' }) },
          { name: 'SDK', value: 'ao' }
        ])
        assert.ok(signer)

        return Resolved({ interactionId: 'data-item-123' })
      }
    })

    await uploadInteraction({
      id: 'contract-asdf',
      input: { function: 'noop' },
      signer: () => {},
      tags: [{ name: 'foo', value: 'bar' }]
    }).toPromise()
      .then(res => assert.equal(res.interactionId, 'data-item-123'))
  })
})
