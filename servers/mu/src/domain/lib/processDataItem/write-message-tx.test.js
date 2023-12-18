import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { writeMessageTxWith } from './write-message-tx.js'

const logger = createLogger('ao-mu:processMsg')

describe('writeMessageTxWith', () => {
  test('write a tx to the scheduler', async () => {
    const writeMessageTx = writeMessageTxWith({
      locateProcess: async (processId) => {
        assert.equal(processId, 'id-1')
        return { url: 'https://foo.bar' }
      },
      writeDataItem: async ({ suUrl, data }) => {
        assert.equal(suUrl, 'https://foo.bar')
        assert.equal(data, 'raw-123')

        return {
          id: 'id-3',
          timestamp: 1234567,
          block: 1234567
        }
      },
      logger
    })

    const result = await writeMessageTx({
      tx: {
        processId: 'id-1',
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

    assert.deepStrictEqual(result.schedulerTx, {
      id: 'id-3',
      timestamp: 1234567,
      block: 1234567
    })
  })
})
