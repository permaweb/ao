import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { writeTxWith } from './write-tx.js'

const logger = createLogger('ao-mu:processMsg')

async function writeSequencerTx() {
    return {
        id: "id-3",
        timestamp: 1234567,
        block: 1234567
    }
}

describe('writeTx', () => {
    test('write a tx to the sequencer', async () => {
      const writeTx = writeTxWith({
        writeSequencerTx,
        logger
      })
  
      const result = await writeTx({
            tx: {
                processId: 'id-1',
                id: 'id-2',
                data: Buffer.alloc(0)
            }
      }).toPromise()

      assert.equal(result.sequencerTx.id, 'id-3')
      assert.notStrictEqual(result.sequencerTx.timestamp, undefined)
      assert.notStrictEqual(result.sequencerTx.block, undefined)
      assert.notStrictEqual(result.sequencerTx.timestamp, null)
      assert.notStrictEqual(result.sequencerTx.block, null)
    })
})