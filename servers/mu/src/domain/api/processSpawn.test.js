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
      locateProcess: async () => ({ id: 'process-id', url: 'url-123' }),
      locateNoRedirect: async () => false,
      writeDataItem: async (item) => {
        return { ...item, id: 'id-123', timestamp: '1234567' }
      },
      buildAndSign: async (tx) => ({ ...tx, signed: true, data: 'data', id: 'id-123' }),
      fetchResult: async (txId, processId) => {
        if (txId === processId) {
          pidDidEqualTxIdCount += 1
        }
        return {
          Messages: [{ Tags: [], Data: '', Target: '', Anchor: '' }],
          Spawns: [{ Tags: [], Data: '', Anchor: '' }],
          Assignments: [{ Message: 'm', Processes: ['a', 'b'] }],
          initialTxId: 'initial-tx-id',
          wallet: 'owner-address-123'
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
      },
      wallet: 'owner-address-123',
      ip: '123.123.123.123'
    }).toPromise()

    /**
     * There should be 2 resulting messages, spawns and assigns one from the
     * boot loader call and one from the spawn success call for all the results
     */
    assert.deepStrictEqual(result.msgs, [
      {
        msg: { Tags: [], Data: '', Target: '', Anchor: '' },
        processId: '',
        initialTxId: 'initial-tx-id',
        fromProcessId: 'id-123',
        parentId: 'id-123',
        wallet: 'owner-address-123'
      },
      {
        msg: { Tags: [], Data: '', Target: '', Anchor: '' },
        processId: '',
        initialTxId: 'initial-tx-id',
        fromProcessId: 'process-id',
        parentId: 'id-123',
        wallet: 'owner-address-123'
      }
    ])

    assert.deepStrictEqual(result.assigns, [
      { Message: 'm', Processes: ['a', 'b'] },
      { Message: 'm', Processes: ['a', 'b'] }
    ])

    assert.deepStrictEqual(result.spawns, [
      {
        spawn: { Tags: [], Data: '', Anchor: '' },
        processId: 'id-123',
        initialTxId: 'initial-tx-id',
        fromProcessId: 'id-123',
        parentId: 'id-123',
        wallet: 'owner-address-123'
      },
      {
        spawn: { Tags: [], Data: '', Anchor: '' },
        processId: 'process-id',
        initialTxId: 'initial-tx-id',
        fromProcessId: undefined,
        parentId: 'id-123',
        wallet: 'owner-address-123'
      }
    ])
    // we should have fetched a result for the process id itself only once
    assert.ok(pidDidEqualTxIdCount === 1)
    assert.equal(result.initialTxId, 'initial-tx-id')
  })
})
