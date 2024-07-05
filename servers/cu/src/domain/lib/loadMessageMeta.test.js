/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadMessageMetaWith } from './loadMessageMeta.js'

const logger = createLogger('ao-cu:readState')

describe('loadMessageMeta', () => {
  test('should append processId and timestamp to ctx', async () => {
    const loadMessageMeta = loadMessageMetaWith({
      findProcess: async () => { throw new Error('woops') },
      locateScheduler: async () => assert.fail('should not call if process is not cached'),
      locateProcess: async ({ processId: id, schedulerHint }) => {
        assert.equal(id, 'process-123')
        assert.ok(schedulerHint === undefined)
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

  test('should use the cached process to provide a scheduler hint', async () => {
    const loadMessageMeta = loadMessageMetaWith({
      findProcess: async () => ({
        id: 'process-123',
        owner: { address: 'woohoo', key: 'key-123' },
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        tags: [
          { name: 'Scheduler', value: 'scheduler-123' },
          { name: 'Foo', value: 'Bar' }
        ],
        block: { height: 123, timestamp: 1697574792 }
      }),
      locateProcess: async ({ processId: id, schedulerHint }) => {
        assert.equal(id, 'process-123')
        assert.equal(schedulerHint, 'scheduler-123')
        return { url: 'https://from.cache' }
      },
      loadMessageMeta: async (args) => {
        assert.deepStrictEqual(args, {
          suUrl: 'https://from.cache',
          processId: 'process-123',
          messageTxId: 'message-tx-123'
        })
        return { processId: 'process-123', timestamp: 1697574792000, nonce: 1 }
      },
      logger
    })

    await loadMessageMeta({ processId: 'process-123', messageTxId: 'message-tx-123' })
      .toPromise()
  })
})
