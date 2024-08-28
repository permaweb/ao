import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { processSpawnWith } from './processSpawn.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

describe('processSpawnWith', () => {
  test('process spawn result', async () => {
    let pidDidEqualTxIdCount = 0
    const processSpawn = processSpawnWith({
      logger,
      locateScheduler: async () => ({ url: 'url-123' }),
      locateProcess: async () => ({ id: 'process-id' }),
      locateNoRedirect: async () => false,
      writeDataItem: async (item) => {
        console.log(501, { item })
        return { ...item, id: 'id-123', timestamp: '1234567' }
      },
      buildAndSign: async (tx) => ({ ...tx, signed: true, data: 'data' }),
      fetchResult: async (txId, processId) => {
        if (txId === processId) {
          pidDidEqualTxIdCount += 1
        }
        return {
          Messages: [{ Tags: [], Data: '' }],
          Spawns: [{ Tags: '', Data: '' }],
          Assignments: [{ Message: 'm', Processes: ['a', 'b'] }],
          initialTxId: 'initial-tx-id'
        }
      },
      fetchSchedulerProcess: async () => ({
        process_id: 'process-id',
        block: '1234',
        owner: {
          address: 'owner-address-123',
          key: 'owner-signature'
        },
        id: 'scheduler-process-id',
        timestamp: 1234567,
        data: 'foo',
        signature: 'signature-123',
        tags: [
          { name: 'Data-Protocol', value: 'existing-protocol' },
          { name: 'Type', value: 'existing-type' },
          { name: 'Variant', value: 'existing-variant' },
          { name: 'Module', value: 'moduleid' },
          { name: 'Scheduler', value: 'sched' }
        ]
      }),
      spawnPushEnabled: true
    })

    const result = await processSpawn({
      initialTxId: 'initial-tx-id',
      logId: 'log-123',
      cachedSpawn: {
        processId: 'process-id',
        initialTxId: 'initial-tx-id',
        spawn: {
          Tags: [
            { name: 'Data-Protocol', value: 'existing-protocol' },
            { name: 'Type', value: 'existing-type' },
            { name: 'Variant', value: 'existing-variant' },
            { name: 'Module', value: 'moduleid' },
            { name: 'Scheduler', value: 'sched' }
          ],
          Data: 'some-data'
        }
      }
    }).toPromise()

    /**
     * There should be 2 resulting messages, spawns and assigns one from the
     * boot loader call and one from the spawn success call for all the results
     */
    assert.deepStrictEqual(result.msgs, [
      {
        msg: { Tags: [], Data: '' },
        processId: undefined,
        initialTxId: 'initial-tx-id',
        fromProcessId: undefined,
        parentId: 'initial-tx-id'
      },
      {
        msg: { Tags: [], Data: '' },
        processId: undefined,
        initialTxId: 'initial-tx-id',
        fromProcessId: 'process-id',
        parentId: 'initial-tx-id'
      }
    ])

    assert.deepStrictEqual(result.assigns, [
      { Message: 'm', Processes: ['a', 'b'] },
      { Message: 'm', Processes: ['a', 'b'] }
    ])

    assert.deepStrictEqual(result.spawns, [
      {
        spawn: { Tags: '', Data: '' },
        processId: undefined,
        initialTxId: 'initial-tx-id',
        fromProcessId: undefined,
        parentId: 'initial-tx-id'
      },
      {
        spawn: { Tags: '', Data: '' },
        processId: 'process-id',
        initialTxId: 'initial-tx-id',
        fromProcessId: undefined,
        parentId: 'initial-tx-id'
      }
    ])
    // we should have fetched a result for the process id itself only once
    assert.ok(pidDidEqualTxIdCount === 1)
    assert.equal(result.initialTxId, 'initial-tx-id')
  })
})
