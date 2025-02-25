import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { writeMessageTxWith } from './write-message-tx.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

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
      logger,
      writeDataItemArweave: async (buffer) => {
        return {
          id: 'arweave-id-3',
          timestamp: 1234567
        }
      }
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

  test('write a tx to arweave', async () => {
    const writeMessageTx = writeMessageTxWith({
      writeDataItem: async ({ data }) => {
        assert.equal(data, 'raw-123')

        return {
          id: 'id-3',
          timestamp: 1234567
        }
      },
      logger,
      writeDataItemArweave: async (buffer) => {
        return {
          id: 'arweave-id-3',
          timestamp: 1234567
        }
      }
    })

    const result = await writeMessageTx({
      tx: {
        processId: 'id-1',
        id: 'arweave-id-3',
        data: Buffer.from('raw-123')
      }
    }).toPromise()

    assert.deepStrictEqual(result.arweaveTx, {
      id: 'arweave-id-3',
      timestamp: 1234567
    })
  })

  test('top up a process from a relay', async () => {
    const writeMessageTx = writeMessageTxWith({
      writeDataItem: async ({ data }) => {
        assert.equal(data, 'raw-123')

        return {
          id: 'id-3',
          timestamp: 1234567
        }
      },
      logger,
      writeDataItemArweave: async (buffer) => {
        return {
          id: 'arweave-id-3',
          timestamp: 1234567
        }
      },
      RELAY_MAP: {
        'ALLOWED_CURRENCIES': ["fromid"],
        'mappedid1': [{ 'url': 'url1' }],
        'mappedid2': [{ 'url': 'url1' }]
      },
      topUp: async (ctx) => {
        assert.deepStrictEqual(ctx.relayUrls, [{ 'url': 'url1' }])
        return {}
      },
    })

    const result = await writeMessageTx({
      tx: {
        processId: 'mappedid1',
        id: 'id-2',
        data: 'raw-123'
      },
      schedLocation: {
        url: 'https://foo.bar'
      },
      cachedMsg: {
        fromProcessId: 'fromid',
        msg: {
          Tags: [{
            name: 'Action',
            value: 'Credit-Notice'
          },
          {
            name: 'Sender',
            value: 's1'
          },
          {
            name: 'Quantity',
            value: '5000'
          }]
        }
      }
    }).toPromise()

    assert.deepStrictEqual(result.schedulerTx, {
      id: 'id-3',
      timestamp: 1234567
    })
  })

  test('top up a process from a relay', async () => {
    const writeMessageTx = writeMessageTxWith({
      writeDataItem: async ({ data }) => {
        assert.equal(data, 'raw-123')

        return {
          id: 'id-3',
          timestamp: 1234567
        }
      },
      logger,
      writeDataItemArweave: async (buffer) => {
        return {
          id: 'arweave-id-3',
          timestamp: 1234567
        }
      },
      RELAY_MAP: {
        'ALLOWED_CURRENCIES': ["ALL"],
        'mappedid1': { 'url': 'url1' },
        'mappedid2': { 'url': 'url1' }
      },
      topUp: async () => {
        assert.fail('Should not top up this process')
      },
    })

    const result = await writeMessageTx({
      tx: {
        processId: 'nonmappedid1',
        id: 'id-2',
        data: 'raw-123'
      },
      schedLocation: {
        url: 'https://foo.bar'
      },
      cachedMsg: {
        msg: {
          Tags: [{
            name: 'Action',
            value: 'Credit-Notice'
          },
          {
            name: 'Sender',
            value: 's1'
          },
          {
            name: 'Quantity',
            value: '5000'
          }]
        }
      }
    }).toPromise()

    assert.deepStrictEqual(result.schedulerTx, {
      id: 'id-3',
      timestamp: 1234567
    })
  })
})
