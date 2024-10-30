import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { spawnProcessWith } from './spawn-process.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

describe('spawnProcess', () => {
  test('spawn process', async () => {
    const spawn = {
      Tags: [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Data-Protocol', value: 'zone' },
        { name: 'Type', value: 'Process' },
        { name: 'Module', value: 'mod-1' },
        { name: 'Scheduler', value: 'scheduler-123' },
        { name: 'foo', value: 'bar' }
      ],
      Data: 'data-123'
    }
    const cachedSpawn = {
      id: '123',
      spawn,
      processId: 'pid-1'
    }
    const spawnProcess = spawnProcessWith({
      writeDataItem: async ({ data, suUrl, logId }) => {
        assert.equal(data, 'new-data-123')
        assert.equal(suUrl, 'url-123')
        assert.equal(logId, 'log-123')

        return {
          id: 'data-item-id-123',
          timestamp: 1234567
        }
      },
      fetchSchedulerProcess: async (processId, url, logId) => {
        assert.equal(processId, 'pid-1')
        assert.equal(url, 'url-123')
        assert.equal(logId, 'log-123')
        return {
          process_id: 'pid-1',
          block: 'block-123',
          owner: {
            address: 'owner-address-123',
            key: 'owner-key-123'
          },
          tags: [
            { name: 'Module', value: 'scheduler-module-123' }
          ],
          timestamp: 1234567,
          signature: 'signature-123'
        }
      },
      locateScheduler: async (scheduler) => {
        assert.equal(scheduler, 'scheduler-123')
        return {
          url: 'url-123'
        }
      },
      locateNoRedirect: async (processId) => {
        assert.equal(processId, 'pid-1')
        return { url: 'url-123', address: 'address-123' }
      },
      buildAndSign: async (stx) => {
        assert.equal(stx.data, 'data-123')
        assert.deepStrictEqual(
          stx.tags,
          [
            // passed in
            { name: 'Data-Protocol', value: 'zone' },
            { name: 'Module', value: 'mod-1' },
            { name: 'Scheduler', value: 'scheduler-123' },
            { name: 'foo', value: 'bar' },
            // added by Mu
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Type', value: 'Process' },
            { name: 'Variant', value: 'ao.TN.1' },
            { name: 'From-Process', value: 'pid-1' }
          ]
        )
        return {
          id: 'new-process-id',
          data: 'new-data-123',
          processId: 'pid-1'
        }
      },
      logger
    })

    const result = await spawnProcess({
      cachedSpawn,
      logId: 'log-123'
    }).toPromise()

    assert.deepStrictEqual(result.cachedSpawn, cachedSpawn)
    assert.equal(result.logId, 'log-123')
    assert.equal(result.processTx, 'new-process-id')
    assert.equal(result.messageId, 'new-process-id')
  })
})
