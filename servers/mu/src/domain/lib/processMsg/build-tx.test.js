import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { buildTxWith } from './build-tx.js'

const logger = createLogger('ao-mu:processMsg')

// this is not what the buildAndSign actually returns
// using tags here as data for testing
async function buildAndSign ({ processId, tags, anchor }) {
  return {
    id: 'id-1',
    // the real function doesnt return tags as data
    // doing this here for testing
    data: tags,
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
          target: 'id-1',
          tags: [],
          anchor: 'anchor-1',
          data: 'data-1'
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

    // ensure buildTx is passing the proper tags to buildAndSign
    assert.equal(result.tx.data.find((tag) =>
      tag.name === 'Data-Protocol'
    ).value, 'ao')
    assert.equal(result.tx.data.find((tag) =>
      tag.name === 'ao-type'
    ).value, 'message')
    assert.equal(result.tx.data.find((tag) =>
      tag.name === 'SDK'
    ).value, 'ao')
  })
})
