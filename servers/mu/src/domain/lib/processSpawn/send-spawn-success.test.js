import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { sendSpawnSuccessWith } from './send-spawn-success.js'


const logger = createLogger('ao-mu:spawnProcess')

describe('sendSpawnSucess', () => {
    test('send spawn success msg', async () => {
      let spawnSucessTx1 = {
        data: Buffer.alloc(0)
      }

      const sendSpawnSucess = sendSpawnSuccessWith({
        writeSequencerTx: async (data) => {
            assert.deepStrictEqual(data, spawnSucessTx1.data)
            return {
                id: "id-1",
                timestamp: 1234567,
                block: 1234567
            }
        },
        logger
      })
  
      const result = await sendSpawnSucess({
            spawnSuccessTx: spawnSucessTx1
      }).toPromise()

      assert.equal(result.spawnSuccessSequencerTx.id, 'id-1')
    })
})