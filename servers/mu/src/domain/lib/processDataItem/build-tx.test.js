import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
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
  return {
    id: 'id-1',
    // the real function doesnt return tags as data
    // doing this here for testing
    data: Buffer.alloc(0),
    processId
  }
}

describe('buildTx', () => {
  test('build and sign a tx from a cached msg', async () => {
    const buildTx = buildTxWith({
      buildAndSign,
      logger
    })

    const result = await buildTx({
      cachedMsg: {
        msg: {
          Target: 'id-1',
          Tags: [],
          Anchor: 'anchor-1',
          Data: 'data-1'
        }
      },
      tracer: ({
        trace: (s) => {
          assert.ok(typeof s === 'string')
          return 1
        }
      })
    }).toPromise()

    assert.equal(result.tx.processId, 'id-1')
  })
})
