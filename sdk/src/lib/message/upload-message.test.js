import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { uploadMessageWith } from './upload-message.js'

const logger = createLogger('message')

describe('upload-message', () => {
  test('add the tags, sign, and upload the message, and return the messageId', async () => {
    const uploadMessage = uploadMessageWith({
      deployMessage: async ({ processId, data, tags, anchor, signer }) => {
        assert.ok(data)
        assert.equal(processId, 'process-asdf')
        assert.deepStrictEqual(tags, [
          { name: 'foo', value: 'bar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Message' },
          { name: 'SDK', value: 'ao' },
          { name: 'Content-Type', value: 'text/plain' }
        ])
        assert.equal(anchor, 'idempotent-123')
        assert.ok(signer)

        return { messageId: 'data-item-123' }
      },
      logger
    })

    await uploadMessage({
      id: 'process-asdf',
      signer: () => {},
      tags: [{ name: 'foo', value: 'bar' }],
      anchor: 'idempotent-123'
    }).toPromise()
      .then(res => assert.equal(res.messageId, 'data-item-123'))
  })
})
