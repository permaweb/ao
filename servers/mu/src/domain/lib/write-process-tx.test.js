import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { writeProcessTxWith } from './write-process-tx.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

describe('writeProcessTxWith', () => {
  test('write a tx to the scheduler', async () => {
    const writeProcessTx = writeProcessTxWith({
      writeDataItem: async ({ suUrl, data }) => {
        assert.equal(suUrl, 'https://foo.bar')
        assert.equal(data, 'raw-123')

        return {
          id: 'id-3',
          timestamp: 1234567
        }
      },
      locateScheduler: async (walletAddress) => {
        assert.equal(walletAddress, 'wallet-123')
        return { url: 'https://foo.bar' }
      },
      logger
    })

    const result = await writeProcessTx({
      tx: {
        processId: 'id-1',
        id: 'id-2',
        data: 'raw-123'
      },
      dataItem: {
        tags: [
          { name: 'Scheduler', value: 'wallet-123' }
        ]
      }
    }).toPromise()

    assert.deepStrictEqual(result.schedulerTx, {
      id: 'id-3',
      timestamp: 1234567
    })
  })

  test('throw if a Scheduler tag is not found', async () => {
    const writeProcessTx = writeProcessTxWith({
      writeDataItem: async ({ suUrl, data }) => {
        return {
          id: 'id-3',
          timestamp: 1234567,
          block: 1234567
        }
      },
      locateScheduler: async (walletAddress) => {
        return { url: 'https://foo.bar' }
      },
      logger
    })

    await writeProcessTx({
      tx: {
        processId: 'id-1',
        id: 'id-2',
        data: 'raw-123'
      },
      dataItem: {
        tags: [
          { name: 'Not_scheduler', value: 'wallet-123' }
        ]
      }
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.equal(err, 'No Scheduler tag found on \'Process\' DataItem'))
  })
})
