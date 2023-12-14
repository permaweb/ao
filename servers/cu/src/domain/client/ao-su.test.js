/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { loadMessageMetaSchema } from '../dal.js'
import { loadMessageMetaWith } from './ao-su.js'

describe('ao-su', () => {
  describe('loadMessageMetaWith', () => {
    test('return the message meta', async () => {
      const loadMessageMeta = loadMessageMetaSchema.implement(
        loadMessageMetaWith({
          fetch: async (url, options) => {
            assert.equal(url, 'https://ao-su-1.onrender.com/message-tx-123?process-id=process-123')
            assert.deepStrictEqual(options, { method: 'GET' })

            return new Response(JSON.stringify({
              process_id: 'process-123',
              sort_key: 'block-123,time-456,hash-789'
            }))
          }
        })
      )

      const res = await loadMessageMeta({
        suUrl: 'https://ao-su-1.onrender.com',
        processId: 'process-123',
        messageTxId: 'message-tx-123'
      })

      assert.deepStrictEqual(res, {
        processId: 'process-123',
        sortKey: 'block-123,time-456,hash-789'
      })
    })
  })
})
