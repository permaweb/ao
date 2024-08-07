import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { processAssignWith } from './processAssign.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

describe('processAssignWith', () => {
  test('process assignment result', async () => {
    const processAssign = processAssignWith({
      writeAssignment: async ({ suUrl, txId, processId }) => {
        assert.equal(suUrl, 'https://foo.bar')
        assert.equal(txId, 'id-1')
        assert.equal(processId, 'pid-1')

        return {
          id: 'id-2',
          timestamp: 1234567
        }
      },
      locateProcess: async (processId) => {
        assert.equal(processId, 'pid-1')
        return { url: 'https://foo.bar' }
      },
      fetchResult: async (txId, processId) => {
        assert.equal(txId, 'id-2')
        assert.equal(processId, 'pid-1')
        return {
          Messages: [
            { id: 'return-message-id' }
          ],
          Spawns: [],
          Assignments: [],
          Output: ''
        }
      },
      logger
    })

    const result = await processAssign({
      assign: {
        txId: 'id-1',
        processId: 'pid-1'
      },
      initialTxId: 'initial-id'
    }).toPromise()

    assert.deepStrictEqual(result.msgs[0].msg, {
      id: 'return-message-id'
    })
  })
})
