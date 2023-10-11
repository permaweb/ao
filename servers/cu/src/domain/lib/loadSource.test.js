import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadSourceWith } from './loadSource.js'

const PROCESS = 'process-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadSource', () => {
  test('appends process srcId and src', async () => {
    const loadSource = loadSourceWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags: [
          { name: 'Contract-Src', value: 'foobar' },
          { name: 'Contract-Type', value: 'ao' },
          { name: 'Content-Type', value: 'application/wasm' }
        ]
      }),
      logger
    })

    const result = await loadSource({ id: PROCESS }).toPromise()
    assert.equal(result.src.byteLength, 17)
    assert.equal(result.srcId, 'foobar')
    assert.equal(result.id, PROCESS)
  })

  test('throw if the Contract-Src tag is not provided', async () => {
    const loadSource = loadSourceWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags: [
          { name: 'Not-Contract-Src', value: 'foobar' },
          { name: 'Contract-Type', value: 'ao' },
          { name: 'Content-Type', value: 'application/wasm' }
        ]
      }),
      logger
    })

    await loadSource({ id: PROCESS }).toPromise()
      .then(() => assert('unreachable. Should have thrown'))
      .catch(assert.ok)
  })

  test('throw if the Contract-Type tag is not "ao"', async () => {
    const loadSource = loadSourceWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags: [
          { name: 'Contract-Src', value: 'foobar' },
          { name: 'Contract-Type', value: 'not_ao' },
          { name: 'Content-Type', value: 'application/wasm' }
        ]
      }),
      logger
    })

    await loadSource({ id: PROCESS }).toPromise()
      .then(() => assert('unreachable. Should have thrown'))
      .catch(assert.ok)
  })

  test('throw if the Content-Type tag is not "application/wasmn"', async () => {
    const loadSource = loadSourceWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags: [
          { name: 'Contract-Src', value: 'foobar' },
          { name: 'Contract-Type', value: 'ao' },
          { name: 'Content-Type', value: 'application/not_wasm' }
        ]
      }),
      logger
    })

    await loadSource({ id: PROCESS }).toPromise()
      .then(() => assert('unreachable. Should have thrown'))
      .catch(assert.ok)
  })
})
