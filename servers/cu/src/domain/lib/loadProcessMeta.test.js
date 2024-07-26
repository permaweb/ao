/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadProcessMetaWith } from './loadProcessMeta.js'

const PROCESS = 'process-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadProcess', () => {
  test('appends suUrl, signature, owner, data, anchor, tags, block to ctx', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'inbox', value: JSON.stringify([]) },
      { name: 'balances', value: JSON.stringify({ 'myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc': 1000 }) }
    ]
    const loadProcessMeta = loadProcessMetaWith({
      isProcessOwnerSupported: async (owner) => {
        assert.equal(owner, 'woohoo')
        return true
      },
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      locateProcess: async ({ processId: id }) => {
        assert.equal(id, PROCESS)
        return { url: 'https://foo.bar' }
      },
      loadProcess: async ({ suUrl, processId }) => {
        assert.equal(processId, PROCESS)
        assert.equal(suUrl, 'https://foo.bar')
        return {
          owner: { address: 'woohoo', key: 'key-123' },
          tags,
          signature: 'sig-123',
          anchor: null,
          data: 'data-123',
          block: { height: 123, timestamp: 1697574792000 }
        }
      },
      logger
    })

    const res = await loadProcessMeta({ id: PROCESS, to: '1697574792000' }).toPromise()

    assert.equal(res.id, PROCESS)
    assert.deepStrictEqual(res.suUrl, 'https://foo.bar')
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.deepStrictEqual(res.signature, 'sig-123')
    assert.deepStrictEqual(res.anchor, null)
    assert.deepStrictEqual(res.data, 'data-123')
    assert.deepStrictEqual(res.block, { height: 123, timestamp: 1697574792000 })
  })

  test('use process from db to set suUrl, owner, tags, and block', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' },
      { name: 'Scheduler', value: 'scheduler-123' }
    ]
    const loadProcessMeta = loadProcessMetaWith({
      isProcessOwnerSupported: async (process) => true,
      findProcess: async () => ({
        id: PROCESS,
        owner: { address: 'woohoo', key: 'key-123' },
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        tags,
        block: { height: 123, timestamp: 1697574792 }
      }),
      saveProcess: async () => assert.fail('should not save if found in db'),
      locateProcess: async ({ processId, schedulerHint }) => {
        assert.equal(processId, PROCESS)
        assert.equal(schedulerHint, 'scheduler-123')
        return { url: 'https://from.cache' }
      },
      loadProcess: async (_id) => assert.fail('should not load process block if found in db'),
      logger
    })

    const res = await loadProcessMeta({ id: PROCESS }).toPromise()

    assert.equal(res.id, PROCESS)
    assert.deepStrictEqual(res.suUrl, 'https://from.cache')
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.deepStrictEqual(res.signature, 'sig-123')
    assert.deepStrictEqual(res.anchor, null)
    assert.deepStrictEqual(res.data, 'data-123')
    assert.deepStrictEqual(res.block, { height: 123, timestamp: 1697574792 })
  })

  test('save process to db if fetched from chain', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcessMeta = loadProcessMetaWith({
      isProcessOwnerSupported: async (process) => true,
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async (process) => {
        assert.deepStrictEqual(process, {
          id: PROCESS,
          owner: { address: 'woohoo', key: 'key-123' },
          tags,
          block: { height: 123, timestamp: 1697574792000 }
        })
        return PROCESS
      },
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: { address: 'woohoo', key: 'key-123' },
        tags,
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    await loadProcessMeta({ id: PROCESS }).toPromise()
  })

  test('gracefully handled failure to save to db', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcessMeta = loadProcessMetaWith({
      isProcessOwnerSupported: async (process) => true,
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => { throw { status: 409 } },
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: { address: 'woohoo', key: 'key-123' },
        tags,
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    const res = await loadProcessMeta({ id: PROCESS }).toPromise()

    assert.equal(res.id, PROCESS)
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.deepStrictEqual(res.block, { height: 123, timestamp: 1697574792000 })
  })

  test('throw if the Module tag is not provided', async () => {
    const loadProcessMeta = loadProcessMetaWith({
      isProcessOwnerSupported: async (process) => true,
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: { address: 'woohoo', key: 'key-123' },
        tags: [
          { name: 'Not_Module', value: 'foobar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Process' }
        ],
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    await loadProcessMeta({ id: PROCESS }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.equal(err, "Tag 'Module': was not found on process"))
  })

  test('throw if the Data-Protocol tag is not "ao"', async () => {
    const loadProcessMeta = loadProcessMetaWith({
      isProcessOwnerSupported: async (process) => true,
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: { address: 'woohoo', key: 'key-123' },
        tags: [
          { name: 'Module', value: 'foobar' },
          { name: 'Data-Protocol', value: 'not_ao' },
          { name: 'Type', value: 'Process' }
        ],
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    await loadProcessMeta({ id: PROCESS }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.equal(err, "Tag 'Data-Protocol': value 'ao' was not found on process"))
  })

  test('throw if the Type tag is not "Process"', async () => {
    const loadProcessMeta = loadProcessMetaWith({
      isProcessOwnerSupported: async (process) => true,
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: { address: 'woohoo', key: 'key-123' },
        tags: [
          { name: 'Module', value: 'foobar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Not_process' }
        ],
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    await loadProcessMeta({ id: PROCESS }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.equal(err, "Tag 'Type': value 'Process' was not found on process"))
  })

  test('throw if the process owner is not allowed', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' },
      { name: 'Scheduler', value: 'scheduler-123' }
    ]
    const loadProcessMeta = loadProcessMetaWith({
      isProcessOwnerSupported: async (process) => false,
      findProcess: async () => ({
        id: PROCESS,
        owner: { address: 'woohoo', key: 'key-123' },
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        tags,
        block: { height: 123, timestamp: 1697574792 }
      }),
      saveProcess: async () => assert.fail('should not save if found in db'),
      locateProcess: async ({ processId, schedulerHint }) => ({ url: 'https://from.cache' }),
      loadProcess: async (_id) => assert.fail('should not load process block if found in db'),
      logger
    })

    await loadProcessMeta({ id: PROCESS }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.deepStrictEqual(err, { status: 403, message: 'Access denied for process owner woohoo' }))
  })
})
