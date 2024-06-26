import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { sendDataItemWith } from './sendDataItem.js'

const logger = createLogger('ao-mu:sendDataItem')

describe('sendDataItemWith', () => {
  describe('Send Data Item', () => {
    describe('Send process', () => {
      test('Send process without target for assignment', async () => {
        let cranked = false
        const sendDataItem = sendDataItemWith({
          selectNode: () => 'cu-url',
          createDataItem: (raw) => ({
            id: 'process-id',
            tags: [
              { name: 'Data-Protocol', value: 'ao' },
              { name: 'Type', value: 'Process' },
              { name: 'Scheduler', value: 'scheduler-id' }
            ]
          }),
          writeDataItem: async (res) => ({
            ...res,
            id: 'scheduler-id',
            timestamp: 1234
          }),
          locateScheduler: async () => ({ url: 'url-123' }),
          locateProcess: (res) => res,
          fetchResult: (res) => res,
          crank: () => {
            cranked = true
          },
          logger,
          fetchSchedulerProcess: (res) => res,
          writeDataItemArweave: (res) => res
        })

        const { crank, ...result } = await sendDataItem({
          raw: '1234',
          tx: { id: 'process-id' }
        }).toPromise()

        assert.equal(result.schedulerTx.id, 'scheduler-id')
        assert.equal(result.schedulerTx.suUrl, 'url-123')
        // TODO: Why is this erroring?
        try {
          await crank().toPromise()
        } catch (_e) {}

        assert.ok(!cranked)
      })

      test('Send process with target for assignment', async () => {
        let cranked = false
        const sendDataItem = sendDataItemWith({
          selectNode: () => 'cu-url',
          createDataItem: (raw) => ({
            id: 'process-id',
            tags: [
              { name: 'Target', value: 'target-process-id' },
              { name: 'Data-Protocol', value: 'ao' },
              { name: 'Type', value: 'Process' },
              { name: 'Scheduler', value: 'scheduler-id' }
            ]
          }),
          writeDataItem: async (res) => ({
            ...res,
            id: 'scheduler-id',
            timestamp: 1234
          }),
          locateScheduler: async () => ({ url: 'url-123' }),
          locateProcess: (res) => res,
          fetchResult: (res) => res,
          crank: ({ assigns, initialTxId }) => {
            cranked = true
            assert.deepStrictEqual(assigns, [{ Message: 'process-id', Processes: ['target-process-id'] }])
            assert.equal(initialTxId, 'process-id')
          },
          logger,
          fetchSchedulerProcess: (res) => res,
          writeDataItemArweave: (res) => res
        })

        const { crank, ...result } = await sendDataItem({
          raw: '1234',
          tx: { id: 'process-id' }
        }).toPromise()

        // TODO: Why is this erroring?
        try {
          await crank().toPromise()
        } catch (_e) {}

        assert.ok(cranked)
        assert.equal(result.schedulerTx.id, 'scheduler-id')
        assert.equal(result.schedulerTx.suUrl, 'url-123')
      })
    })
  })
})
