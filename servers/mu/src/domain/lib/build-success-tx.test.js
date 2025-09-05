import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { buildSuccessTxWith } from './build-success-tx.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

describe('buildSuccessTx', () => {
  test('build spawn success msg', async () => {
    const spawnedTags = [
      { name: 'Type', value: 'Process' },
      { name: 'Variant', value: 'ao.TN.1' },
      { name: '_Ref', value: '123' },
      { name: 'Foo', value: 'Bar' }
    ]

    const buildSuccessTx = buildSuccessTxWith({
      buildAndSign: async (stx) => {
        assert.equal(stx.processId, 'pid-1')
        assert.deepStrictEqual(
          stx.tags,
          [
            // from spawn.Tags
            { name: '_Ref', value: '123' },
            { name: 'Foo', value: 'Bar' },
            // added by Mu
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Type', value: 'Message' },
            { name: 'Process', value: 'pid-2' },
            { name: 'Action', value: 'Spawned' },
            { name: 'Variant', value: 'ao.TN.1' }
          ]
        )
        return {
          id: 'new-id',
          data: Buffer.alloc(0),
          processId: 'pid-1'
        }
      },
      logger
    })

    const result = await buildSuccessTx({
      cachedSpawn: {
        processId: 'pid-1',
        spawn: {
          Tags: spawnedTags
        }
      },
      processTx: 'pid-2'
    }).toPromise()

    assert.equal(result.spawnSuccessTx.id, 'new-id')
  })

  test('build spawn success msg with variant ao.N.1', async () => {
    const spawnedTags = [
      { name: 'Type', value: 'Process' },
      { name: 'Variant', value: 'ao.N.1' },
      { name: '_Ref', value: '123' },
      { name: 'Foo', value: 'Bar' }
    ]

    const buildSuccessTx = buildSuccessTxWith({
      buildAndSign: async (stx) => {
        assert.equal(stx.processId, 'pid-1')
        assert.deepStrictEqual(
          stx.tags,
          [
            // from spawn.Tags
            { name: '_Ref', value: '123' },
            { name: 'Foo', value: 'Bar' },
            // added by Mu
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Type', value: 'Message' },
            { name: 'Process', value: 'pid-2' },
            { name: 'Action', value: 'Spawned' },
            { name: 'Variant', value: 'ao.N.1' }
          ]
        )
        return {
          id: 'new-id',
          data: Buffer.alloc(0),
          processId: 'pid-1'
        }
      },
      logger
    })

    const result = await buildSuccessTx({
      cachedSpawn: {
        processId: 'pid-1',
        spawn: {
          Tags: spawnedTags
        }
      },
      processTx: 'pid-2'
    }).toPromise()

    assert.equal(result.spawnSuccessTx.id, 'new-id')
  })
  test('build spawn success msg with unknown variant', async () => {
    const spawnedTags = [
      { name: 'Type', value: 'Process' },
      { name: 'Variant', value: 'ao.UNKNOWN.1' },
      { name: '_Ref', value: '123' },
      { name: 'Foo', value: 'Bar' }
    ]

    const buildSuccessTx = buildSuccessTxWith({
      buildAndSign: async (stx) => {
        assert.equal(stx.processId, 'pid-1')
        assert.deepStrictEqual(
          stx.tags,
          [
            // from spawn.Tags
            { name: '_Ref', value: '123' },
            { name: 'Foo', value: 'Bar' },
            // added by Mu
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Type', value: 'Message' },
            { name: 'Process', value: 'pid-2' },
            { name: 'Action', value: 'Spawned' },
            { name: 'Variant', value: 'ao.TN.1' }
          ]
        )
        return {
          id: 'new-id',
          data: Buffer.alloc(0),
          processId: 'pid-1'
        }
      },
      logger
    })

    const result = await buildSuccessTx({
      cachedSpawn: {
        processId: 'pid-1',
        spawn: {
          Tags: spawnedTags
        }
      },
      processTx: 'pid-2'
    }).toPromise()

    assert.equal(result.spawnSuccessTx.id, 'new-id')
  })
})
