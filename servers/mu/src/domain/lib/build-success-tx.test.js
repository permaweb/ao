import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { buildSuccessTxWith } from './build-success-tx.js'

const logger = createLogger('ao-mu:spawnProcess')

describe('buildSuccessTx', () => {
  test('build spawn success msg', async () => {
    const spawnedTags = [
      { name: 'Type', value: 'Process' },
      { name: 'Variant', value: 'ao.TN.2' },
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
            { name: 'Variant', value: 'ao.TN.1' },
            { name: 'Type', value: 'Message' },
            { name: 'Process', value: 'pid-2' },
            { name: 'Action', value: 'Spawned' },
            { name: 'AO-Spawn-Success', value: 'pid-2' }
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
