import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { writeMessageTxWith } from './write-message-tx.js'

const logger = createLogger('ao-mu:processMsg')

describe('writeMessageTxWith', () => {
  test('write a tx to the scheduler', async () => {
    const writeMessageTx = writeMessageTxWith({
      writeDataItem: async ({ data }) => {
        assert.equal(data, 'raw-123')

        return {
          id: 'id-3',
          timestamp: 1234567
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
      schedLocation: {
        url: 'https://foo.bar'
      }
    }).toPromise()

    assert.deepStrictEqual(result.schedulerTx, {
      id: 'id-3',
      timestamp: 1234567
    })
  })
})
