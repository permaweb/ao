import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { buildTxWith } from './build-tx.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

// this is not what the buildAndSign actually returns
// using tags here as data for testing
async function buildAndSign ({ processId, tags, anchor }) {
  assert.equal(tags.find((tag) =>
    tag.name === 'Data-Protocol'
  ).value, 'ao')
  assert.equal(tags.find((tag) =>
    tag.name === 'Type'
  ).value, 'Message')
  assert.equal(tags.find((tag) =>
    tag.name === 'From-Process'
  ).value, 'process-123')
  assert.equal(tags.filter((tag) =>
    tag.name === 'From-Process'
  ).length, 1)

  return {
    id: 'id-1',
    data: Buffer.alloc(0),
    processId
  }
}

async function locateProcess () {
  return { url: 'sched-url' }
}

async function fetchSchedulerProcess () {
  return {
    process_id: 'pid-1',
    block: 'block-1',
    owner: {
      address: 'address-1',
      key: 'key-1'
    },
    tags: [{ name: 'Module', value: 'mod-1' }],
    timestamp: 1234,
    data: '1984',
    signature: 'signature-1'
  }
}

async function isWallet (_id) {
  return false
}

describe('buildTx', () => {
  test('build and sign a tx from a cached msg', async () => {
    const buildTx = buildTxWith({
      buildAndSign,
      logger,
      locateProcess,
      fetchSchedulerProcess,
      isWallet
    })

    const result = await buildTx({
      cachedMsg: {
        msg: {
          Target: 'id-1',
          Tags: [
            { name: 'Assignments', value: ['p1', 'p2'] }
          ],
          Anchor: 'anchor-1',
          Data: 'data-1'
        },
        processId: 'pid-1',
        fromProcessId: 'process-123'
      },
      logId: 'log-1'
    }).toPromise()

    assert.equal(result.tx.processId, 'id-1')
    assert.deepStrictEqual(result.tagAssignments, [{ Processes: ['p1', 'p2'], Message: 'id-1' }])
  })

  test('build and sign a tx from a cached msg with duplicate tags', async () => {
    const buildTx = buildTxWith({
      buildAndSign,
      logger,
      locateProcess,
      fetchSchedulerProcess,
      isWallet
    })

    const result = await buildTx({
      cachedMsg: {
        msg: {
          Target: 'id-1',
          Tags: [
            { name: 'Assignments', value: ['p1', 'p2'] },
            { name: 'From-Process', value: 'Process1' },
            { name: 'From-Process', value: 'Process2' }
          ],
          Anchor: 'anchor-1',
          Data: 'data-1'
        },
        processId: 'pid-1',
        fromProcessId: 'process-123'
      },
      logId: 'log-1'
    }).toPromise()

    assert.equal(result.tx.processId, 'id-1')
    assert.deepStrictEqual(result.tagAssignments, [{ Processes: ['p1', 'p2'], Message: 'id-1' }])
  })
})
