import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { pullResultWith } from './pull-result.js'

const logger = createLogger('ao-mu:processMsg')

describe('pullResultWith', () => {
  test('fetch result by transaction id', async () => {
    const msg1 = { Tags: [{ name: 'Data-Protocol', value: 'ao' }] }
    const spawn1 = { Tags: [{ name: 'Data-Protocol', value: 'ao' }] }
    const cachedMsg1 = {
      fromTxId: 'id-1',
      msg: msg1,
      processId: 'pid-1',
      initialTxId: 'i-1'
    }
    const cachedSpawn1 = {
      fromTxId: 'id-1',
      spawn: spawn1,
      processId: 'pid-1',
      initialTxId: 'i-1'
    }
    const pullResult = pullResultWith({
      fetchResult: async (id) => {
        assert.equal(id, 'id-1')
        return {
          Messages: [msg1],
          Spawns: [spawn1]
        }
      },
      logger
    })

    const result = await pullResult({
      tx: {
        id: 'id-1',
        processId: 'pid-1'
      },
      tracer: ({
        trace: (s) => {
          assert.ok(typeof s === 'string')
          return 1
        }
      }),
      initialTxId: 'i-1'
    }).toPromise()

    assert.deepStrictEqual(result.msgs[0], cachedMsg1)
    assert.deepStrictEqual(result.spawns[0], cachedSpawn1)
  })
})
