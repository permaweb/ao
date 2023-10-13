/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadProcessWith } from './loadProcess.js'

const PROCESS = 'process-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadProcess', () => {
  test('appends process owner and tags', async () => {
    const tags = [
      { name: 'Contract-Src', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'ao-type', value: 'process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags
      }),
      logger
    })

    const res = await loadProcess({ id: PROCESS }).toPromise()
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.equal(res.id, PROCESS)
  })

  test('use process from db', async () => {
    const tags = [
      { name: 'Contract-Src', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'ao-type', value: 'process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => ({
        id: PROCESS,
        owner: 'woohoo',
        tags
      }),
      saveProcess: async () => assert.fail('should not save if found in db'),
      loadTransactionMeta: async (_id) => assert.fail('should not load transaction meta if found in db'),
      logger
    })

    const res = await loadProcess({ id: PROCESS }).toPromise()
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.equal(res.id, PROCESS)
  })

  test('save process to db if fetched from chain', async () => {
    const tags = [
      { name: 'Contract-Src', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'ao-type', value: 'process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async (process) => {
        assert.deepStrictEqual(process, { id: PROCESS, owner: 'woohoo', tags })
        return PROCESS
      },
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags
      }),
      logger
    })

    const res = await loadProcess({ id: PROCESS }).toPromise()
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.equal(res.id, PROCESS)
  })

  test('gracefully handled failure to save to db', async () => {
    const tags = [
      { name: 'Contract-Src', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'ao-type', value: 'process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => { throw { status: 409 } },
      loadTransactionMeta: async (_id) => ({
        owner: { address: 'woohoo' },
        tags
      }),
      logger
    })

    const res = await loadProcess({ id: PROCESS }).toPromise()
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.equal(res.id, PROCESS)
  })

  test('throw if the Contract-Src tag is not provided', async () => {
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
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
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
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
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
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
