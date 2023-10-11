import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadProcessWith } from './loadProcess.js'

const PROCESS = 'process-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadProcess', () => {
  test('appends process tags and state', async () => {
    const loadProcess = loadProcessWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags: [
          { name: 'Contract-Src', value: 'foobar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'ao-type', value: 'process' },
          { name: 'Foo', value: 'Bar' }
        ]
      }),
      logger
    })

    const expected = {
      'Contract-Src': 'foobar',
      'Data-Protocol': 'ao',
      'ao-type': 'process',
      Foo: 'Bar'
    }
    const res = await loadProcess({ id: PROCESS }).toPromise()
    assert.deepStrictEqual(res.tags, expected)
    assert.deepStrictEqual(res.state, expected)
    assert.equal(res.id, PROCESS)
  })

  test('throw if the Contract-Src tag is not provided', async () => {
    const loadProcess = loadProcessWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags: [
          { name: 'Not-Contract-Src', value: 'foobar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'ao-type', value: 'process' }
        ]
      }),
      logger
    })

    await loadProcess({ id: PROCESS }).toPromise()
      .then(() => assert('unreachable. Should have thrown'))
      .catch(assert.ok)
  })

  test('throw if the Data-Protocol tag is not "ao"', async () => {
    const loadProcess = loadProcessWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags: [
          { name: 'Contract-Src', value: 'foobar' },
          { name: 'Data-Protocol', value: 'not_ao' },
          { name: 'ao-type', value: 'process' }
        ]
      }),
      logger
    })

    await loadProcess({ id: PROCESS }).toPromise()
      .then(() => assert('unreachable. Should have thrown'))
      .catch(assert.ok)
  })

  test('throw if the ao-type tag is not "process"', async () => {
    const loadProcess = loadProcessWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags: [
          { name: 'Contract-Src', value: 'foobar' },
          { name: 'Data-Protocol', value: 'not_ao' },
          { name: 'ao-type', value: 'message' }
        ]
      }),
      logger
    })

    await loadProcess({ id: PROCESS }).toPromise()
      .then(() => assert('unreachable. Should have thrown'))
      .catch(assert.ok)
  })
})
