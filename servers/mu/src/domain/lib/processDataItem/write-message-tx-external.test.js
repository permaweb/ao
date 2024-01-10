import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { writeMessageTxExternalWith } from './write-message-tx-external.js'

const logger = createLogger('ao-mu:processMsg')

describe('writeMessageTxExternalWith', () => {
  test('write a tx to the scheduler', async () => {
    const writeMessageTxExternal = writeMessageTxExternalWith({
      writeDataItemArweave: async (data) => {
        assert.equal(data, 'raw-123')

        return {
          id: 'id-3',
          timestamp: 1234567
        }
      },
      logger
    })

    const result = await writeMessageTxExternal({
      tx: {
        id: 'id-2',
        data: 'raw-123'
      },
      tracer: ({
        child: (id) => {
          assert.equal(id, 'id-2')
          return 1
        },
        trace: (s) => {
          assert.ok(typeof s === 'string')
          return 1
        }
      })
    }).toPromise()

    assert.deepStrictEqual(result.arweaveTx, {
      id: 'id-3',
      timestamp: 1234567
    })
  })
})
