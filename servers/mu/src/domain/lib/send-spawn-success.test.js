import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { sendSpawnSuccessWith } from './send-spawn-success.js'

const logger = createLogger('ao-mu:spawnProcess')

describe('sendSpawnSucess', () => {
  test('send spawn success msg', async () => {
    const spawnSucessTx1 = {
      data: Buffer.alloc(0)
    }

    const sendSpawnSucess = sendSpawnSuccessWith({
      writeDataItem: async (data) => {
        assert.deepStrictEqual(data.data, spawnSucessTx1.data.toString('base64'))
        assert.deepStrictEqual(data.suUrl, 'su-url-1')
        return {
          id: 'id-1',
          timestamp: 1234567,
          block: 1234567
        }
      },
      locateProcess: async (_processId) => {
        return { url: 'su-url-1' }
      },
      logger
    })

    const result = await sendSpawnSucess({
      spawnSuccessTx: spawnSucessTx1,
      cachedSpawn: {
        processId: 'pid-1'
      }
    }).toPromise()

    assert.equal(result.spawnSuccessSequencerTx.id, 'id-1')
  })
})
