import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { writeMessageTxWith } from './write-message-tx.js'

const logger = createLogger('ao-mu:processMsg')

async function writeDataItem () {
  return {
    id: 'id-3',
    timestamp: 1234567,
    block: 1234567
  }
}

describe('writeMessageTxWith', () => {
  test('write a tx to the sequencer', async () => {
    const writeMessageTx = writeMessageTxWith({
      writeDataItem,
      logger
    })

    const result = await writeMessageTx({
      tx: {
        processId: 'id-1',
        id: 'id-2',
        data: Buffer.alloc(0)
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

    assert.equal(result.schedulerTx.id, 'id-3')
    assert.notStrictEqual(result.schedulerTx.timestamp, undefined)
    assert.notStrictEqual(result.schedulerTx.block, undefined)
    assert.notStrictEqual(result.schedulerTx.timestamp, null)
    assert.notStrictEqual(result.schedulerTx.block, null)
  })
})
