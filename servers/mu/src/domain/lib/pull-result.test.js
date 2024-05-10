import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { pullResultWith } from './pull-result.js'

const logger = createLogger('ao-mu:processMsg')

describe('pullResultWith', () => {
  test('fetch result by transaction id', async () => {
    const msg1 = { Tags: [{ name: 'Data-Protocol', value: 'ao' }], Target: 'pid-1' }
    const spawn1 = { Tags: [{ name: 'Data-Protocol', value: 'ao' }] }
    const assign1 = { Processes: ['p1'], Message: 'm1' }
    const cachedMsg1 = {
      msg: msg1,
      fromProcessId: 'pid-1',
      processId: 'pid-1',
      initialTxId: 'i-1'
    }
    const cachedSpawn1 = {
      spawn: spawn1,
      processId: 'pid-1',
      initialTxId: 'i-1'
    }
    const pullResult = pullResultWith({
      fetchResult: async (id) => {
        assert.equal(id, 'id-1')
        return {
          Messages: [msg1],
          Spawns: [spawn1],
          Assignments: [assign1]
        }
      },
      logger
    })

    const result = await pullResult({
      tx: {
        id: 'id-1',
        processId: 'pid-1'
      },
      initialTxId: 'i-1',
      tagAssignments: [{ Processes: ['p2'], Message: 'm2' }]
    }).toPromise()

    assert.deepStrictEqual(result.msgs[0], cachedMsg1)
    assert.deepStrictEqual(result.spawns[0], cachedSpawn1)
    assert.deepStrictEqual(result.assigns[0], assign1)
    assert.deepStrictEqual(result.assigns[1], { Processes: ['p2'], Message: 'm2' })
  })
})
