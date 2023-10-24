import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadSourceWith } from './loadSource.js'

const PROCESS = 'contract-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadSource', () => {
  test('append process source and process source id', async () => {
    const loadSource = loadSourceWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      logger
    })

    const result = await loadSource({ id: PROCESS, tags: [{ name: 'Contract-Src', value: 'foobar' }] }).toPromise()
    assert.equal(result.src.byteLength, 17)
    assert.equal(result.srcId, 'foobar')
    assert.equal(result.id, PROCESS)
  })
})
