/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadMessageMetaWith } from './loadMessageMeta.js'

const logger = createLogger('ao-cu:readState')

describe('loadMessageMeta', () => {
  test('should append processId and sortKey to ctx', async () => {
    const loadMessageMeta = loadMessageMetaWith({
      loadMessageMeta: async (args) => {
        assert.deepStrictEqual(args, { messageTxId: 'message-tx-123' })
        return { processId: 'process-123', sortKey: 'sortkey-123' }
      },
      logger
    })

    const res = await loadMessageMeta({ messageTxId: 'message-tx-123' }).toPromise()

    assert.deepStrictEqual(res, { processId: 'process-123', sortKey: 'sortkey-123' })
  })
})
