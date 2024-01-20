/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadMessageMetaWith } from './loadMessageMeta.js'

const logger = createLogger('ao-cu:readState')

describe('loadMessageMeta', () => {
  test('should append processId and timestamp to ctx', async () => {
    const loadMessageMeta = loadMessageMetaWith({
      locateScheduler: async (id) => {
        assert.equal(id, 'process-123')
        return { url: 'https://foo.bar' }
      },
      loadMessageMeta: async (args) => {
        assert.deepStrictEqual(args, {
          suUrl: 'https://foo.bar',
          processId: 'process-123',
          messageTxId: 'message-tx-123'
        })
        return { processId: 'process-123', timestamp: 1697574792000, nonce: 1 }
      },
      logger
    })

    const res = await loadMessageMeta({ processId: 'process-123', messageTxId: 'message-tx-123' })
      .toPromise()

    assert.deepStrictEqual(res, { processId: 'process-123', timestamp: 1697574792000, nonce: 1 })
  })
})
