import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { buildSuccessTxWith } from './build-success-tx.js'

const logger = createLogger('ao-mu:spawnProcess')

describe('buildSuccessTx', () => {
  test('build spawn success msg', async () => {
    const tags1 = [
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Message' },
      { name: 'AO-Spawn-Success', value: 'pid-2' }
    ]

    const buildSuccessTx = buildSuccessTxWith({
      buildAndSign: async (stx) => {
        assert.equal(stx.processId, 'pid-1')
        assert.deepStrictEqual(stx.tags, tags1)
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
        processId: 'pid-1'
      },
      processTx: 'pid-2'
    }).toPromise()

    assert.equal(result.spawnSuccessTx.id, 'new-id')
  })
})
