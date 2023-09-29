import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { loadStateWith } from './load-state.js'

const CONTRACT = 'contract-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('load-state', () => {
  test('add the most recent state from cache', async () => {
    const loadState = loadStateWith({
      findLatestEvaluation: async ({ id, _to }) => ({
        sortKey: '123_sortKey',
        parent: 'contract-123',
        cachedAt: new Date(),
        action: { input: { function: 'noop' } },
        output: { state: { foo: 'bar' } }
      }),
      loadTransactionData: async (_id) => assert.fail('unreachable'),
      loadTransactionMeta: async (_id) => assert.fail('unreachable'),
      logger
    })

    const result = await loadState({ id: CONTRACT }).toPromise()
    assert.ok(result.id)
    assert.deepStrictEqual(result.state, { foo: 'bar' })
    assert.equal(result.from, '123_sortKey')
  })

  test('add the initial state from Init-State', async () => {
    const loadState = loadStateWith({
      findLatestEvaluation: async ({ _id, _to }) => undefined,
      loadTransactionData: async (_id) => assert.fail('unreachable'),
      loadTransactionMeta: async (_id) => ({
        tags: [{ name: 'Init-State', value: JSON.stringify({ foo: 'bar' }) }]
      }),
      logger
    })

    const result = await loadState({ id: CONTRACT }).toPromise()
    assert.ok(result.id)
    assert.deepStrictEqual(result.state, { foo: 'bar' })
    assert.equal(result.from, undefined)
  })

  test('add the initial state from Init-State-Tx', async () => {
    const initStateTx = CONTRACT

    const loadState = loadStateWith({
      findLatestEvaluation: async ({ _id, _to }) => undefined,
      loadTransactionData: async (id) => {
        assert.equal(id, initStateTx)
        return new Response(JSON.stringify({ foo: 'bar' }))
      },
      loadTransactionMeta: async (_id) => ({
        tags: [{ name: 'Init-State-Tx', value: initStateTx }]
      }),
      logger
    })

    const result = await loadState({ id: CONTRACT }).toPromise()
    assert.ok(result.id)
    assert.deepStrictEqual(result.state, { foo: 'bar' })
    assert.equal(result.from, undefined)
  })

  test('add the initial state from transaction data', async () => {
    const loadState = loadStateWith({
      findLatestEvaluation: async ({ _id, _to }) => undefined,
      loadTransactionData: async (id) => {
        assert.equal(id, CONTRACT)
        return new Response(JSON.stringify({ foo: 'bar' }))
      },
      loadTransactionMeta: async (_id) => ({
        tags: [{ name: 'Title', value: 'Foobar' }]
      }),
      logger
    })

    const result = await loadState({ id: CONTRACT }).toPromise()
    assert.ok(result.id)
    assert.deepStrictEqual(result.state, { foo: 'bar' })
    assert.equal(result.from, undefined)
  })
})
