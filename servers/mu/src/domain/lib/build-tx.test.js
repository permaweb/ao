import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { buildTxWith } from './build-tx.js'

const logger = createLogger('ao-mu:processMsg')

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
  return { tags: [{ name: 'Module', value: 'mod-1' }] }
}

describe('buildTx', () => {
  test('build and sign a tx from a cached msg', async () => {
    const buildTx = buildTxWith({
      buildAndSign,
      logger,
      locateProcess,
      fetchSchedulerProcess
    })

    const result = await buildTx({
      cachedMsg: {
        msg: {
          Target: 'id-1',
          Tags: [
            { name: 'Assignments', value: '[{"Processes":["p2"],"Message":"m2"}]' }
          ],
          Anchor: 'anchor-1',
          Data: 'data-1'
        },
        processId: 'process-123'
      }
    }).toPromise()

    assert.equal(result.tx.processId, 'id-1')
    assert.deepStrictEqual(result.tagAssignments, [{ Processes: ['p2'], Message: 'm2' }])
  })
})
