import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { sendDataItemWith } from './sendDataItem.js'
import { Resolved } from 'hyper-async'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

describe('sendDataItemWith', () => {
  describe('Send Data Item', () => {
    describe('Send process', () => {
      test('Send process without target for assignment', async () => {
        const sendDataItem = sendDataItemWith({
          selectNode: async (res) => 'cu-url',
          createDataItem: (raw) => ({
            id: 'process-id',
            tags: [
              { name: 'Data-Protocol', value: 'ao' },
              { name: 'Type', value: 'Process' },
              { name: 'Scheduler', value: 'scheduler-id' }
            ],
            data: 'test-data'
          }),
          writeDataItem: async (res) => ({
            ...res,
            id: 'scheduler-id',
            timestamp: 1234567
          }),
          locateScheduler: async () => ({ url: 'url-123' }),
          locateProcess: async (res) => {
            return ({
              url: 'url-1234',
              address: 'address-123'
            })
          },
          fetchResult: (res) => res,
          crank: (res) => {
            assert.ok(res.assigns.length === 0)
            return Resolved()
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
        assert.equal(result.schedulerTx.timestamp, 1234567)

        await crank().toPromise()
      })

      test('Send process with target for assignment', async () => {
        const sendDataItem = sendDataItemWith({
          selectNode: async (res) => 'cu-url',
          createDataItem: (raw) => ({
            id: 'process-id',
            target: 'target-process-id',
            tags: [
              { name: 'Data-Protocol', value: 'ao' },
              { name: 'Type', value: 'Process' },
              { name: 'Scheduler', value: 'scheduler-id' }
            ],
            data: 'test-data'
          }),
          writeDataItem: async (res) => ({
            ...res,
            id: 'scheduler-id',
            timestamp: 1234567
          }),
          locateScheduler: async () => ({ url: 'url-123' }),
          locateProcess: (res) => res,
          fetchResult: async (res) => {
            return {
              Messages: [],
              Spawns: [],
              Assignments: [],
              Output: ''
            }
          },
          crank: (res) => {
            assert.ok(res.assigns.length > 0)
            return Resolved()
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
        assert.equal(result.schedulerTx.timestamp, 1234567)

        await crank().toPromise()
      })

      test('Send process with messages on boot', async () => {
        const sendDataItem = sendDataItemWith({
          selectNode: async (res) => 'cu-url',
          createDataItem: (raw) => ({
            id: 'process-id',
            target: 'target-process-id',
            tags: [
              { name: 'Data-Protocol', value: 'ao' },
              { name: 'Type', value: 'Process' },
              { name: 'Scheduler', value: 'scheduler-id' }
            ],
            data: 'test-data'
          }),
          writeDataItem: async (res) => ({
            ...res,
            id: 'scheduler-id',
            timestamp: 1234567
          }),
          locateScheduler: async () => ({ url: 'url-123' }),
          locateProcess: (res) => res,
          fetchResult: async (res) => {
            return {
              Messages: [{
                Tags: [],
                Target: 'target',
                Data: 'Data',
                Anchor: '0000'
              }],
              Spawns: [],
              Assignments: [],
              Output: ''
            }
          },
          crank: (res) => {
            assert.ok(res.assigns.length > 0)
            // check that message shave been sent to crank
            assert.ok(res.msgs.length > 0)
            return Resolved()
          },
          logger,
          fetchSchedulerProcess: (res) => res,
          writeDataItemArweave: (res) => res,
          spawnPushEnabled: true
        })

        const { crank, ...result } = await sendDataItem({
          raw: '1234',
          tx: { id: 'process-id' },
          logId: 'log-123'
        }).toPromise()

        assert.equal(result.schedulerTx.id, 'scheduler-id')
        assert.equal(result.schedulerTx.timestamp, 1234567)

        await crank().toPromise()
      })
    })
  })
})
