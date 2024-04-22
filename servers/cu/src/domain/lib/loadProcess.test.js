/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadProcessWith } from './loadProcess.js'
import { COLLATION_SEQUENCE_MIN_CHAR } from '../client/sqlite.js'

const PROCESS = 'process-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadProcess', () => {
  test('appends suUrl, process owner, tags, block, buffer as process tags parsed as JSON, result, from, fromCron, fromBlockHeight and evaluatedAt to ctx', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'inbox', value: JSON.stringify([]) },
      { name: 'balances', value: JSON.stringify({ 'myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc': 1000 }) }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      findEvaluation: async () => { throw { status: 404 } },
      findProcessMemoryBefore: async () => ({
        src: 'cold_start',
        Memory: null,
        moduleId: undefined,
        timestamp: undefined,
        epoch: undefined,
        nonce: undefined,
        blockHeight: undefined,
        cron: undefined,
        ordinate: COLLATION_SEQUENCE_MIN_CHAR
      }),
      saveLatestProcessMemory: async () => assert.fail('should not be called on cold_start'),
      locateProcess: async ({ processId: id }) => {
        assert.equal(id, PROCESS)
        return { url: 'https://foo.bar' }
      },
      loadProcess: async ({ suUrl, processId }) => {
        assert.equal(processId, PROCESS)
        assert.equal(suUrl, 'https://foo.bar')
        return {
          owner: 'woohoo',
          tags,
          signature: 'sig-123',
          anchor: null,
          data: 'data-123',
          block: { height: 123, timestamp: 1697574792000 }
        }
      },
      logger
    })

    const res = await loadProcess({ id: PROCESS, to: '1697574792000' }).toPromise()

    assert.deepStrictEqual(res.suUrl, 'https://foo.bar')
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.deepStrictEqual(res.signature, 'sig-123')
    assert.deepStrictEqual(res.anchor, null)
    assert.deepStrictEqual(res.data, 'data-123')
    assert.deepStrictEqual(res.block, { height: 123, timestamp: 1697574792000 })
    assert.deepStrictEqual(res.result, { Memory: null })
    assert.equal(res.from, undefined)
    assert.equal(res.fromCron, undefined)
    assert.equal(res.ordinate, COLLATION_SEQUENCE_MIN_CHAR)
    assert.equal(res.fromBlockHeight, undefined)
    assert.equal(res.evaluatedAt, undefined)
    assert.equal(res.id, PROCESS)
  })

  test('use process from db to set suUrl, owner, tags, and block', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' },
      { name: 'Scheduler', value: 'scheduler-123' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => ({
        id: PROCESS,
        owner: 'woohoo',
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        tags,
        block: { height: 123, timestamp: 1697574792 }
      }),
      saveProcess: async () => assert.fail('should not save if found in db'),
      findEvaluation: async () => { throw { status: 404 } },
      findProcessMemoryBefore: async () => ({
        src: 'cold_start',
        Memory: null,
        moduleId: undefined,
        timestamp: undefined,
        epoch: undefined,
        nonce: undefined,
        blockHeight: undefined,
        cron: undefined,
        ordinate: COLLATION_SEQUENCE_MIN_CHAR
      }),
      saveLatestProcessMemory: async () => assert.fail('should not be called on cold_start'),
      locateProcess: async ({ processId, schedulerHint }) => {
        assert.equal(processId, PROCESS)
        assert.equal(schedulerHint, 'scheduler-123')
        return { url: 'https://from.cache' }
      },
      loadProcess: async (_id) => assert.fail('should not load process block if found in db'),
      logger
    })

    const res = await loadProcess({ id: PROCESS }).toPromise()
    assert.deepStrictEqual(res.suUrl, 'https://from.cache')
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.deepStrictEqual(res.signature, 'sig-123')
    assert.deepStrictEqual(res.anchor, null)
    assert.deepStrictEqual(res.data, 'data-123')
    assert.deepStrictEqual(res.block, { height: 123, timestamp: 1697574792 })
    assert.equal(res.id, PROCESS)
  })

  test('use exact match from db', async () => {
    const cachedEvaluation = {
      processId: PROCESS,
      messageId: 'message-123',
      cron: '1-10-minutes',
      timestamp: 1697574792000,
      ordinate: '1',
      blockHeight: 1234,
      evaluatedAt: new Date(),
      output: {
        Messages: [
          {
            target: 'foobar',
            tags: [
              { name: 'foo', value: 'bar' }
            ]
          }
        ],
        Output: [],
        Spawns: []
      }
    }

    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      findEvaluation: async () => cachedEvaluation,
      findProcessMemoryBefore: async ({ processId, timestamp }) => {
        assert.fail('should not be called when exact match is found')
      },
      saveLatestProcessMemory: async () => assert.fail('should not be called if exact match if found'),
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: 'woohoo',
        tags,
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    const res = await loadProcess({ id: PROCESS, to: 1697574792000 }).toPromise()
    assert.deepStrictEqual(res.result, cachedEvaluation.output)
    assert.deepStrictEqual(res.from, cachedEvaluation.timestamp)
    assert.deepStrictEqual(res.ordinate, cachedEvaluation.ordinate)
    assert.deepStrictEqual(res.fromCron, cachedEvaluation.cron)
    assert.deepStrictEqual(res.fromBlockHeight, cachedEvaluation.blockHeight)
    assert.equal(res.id, PROCESS)
  })

  test('use latest in cache', async () => {
    const cached = {
      src: 'memory',
      Memory: Buffer.from('hello world'),
      moduleId: 'module-123',
      timestamp: 1697574792000,
      epoch: 0,
      nonce: 11,
      blockHeight: 123,
      cron: undefined,
      ordinate: '11'
    }

    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      findEvaluation: async () => { throw { status: 404 } },
      findProcessMemoryBefore: async ({ processId, timestamp }) => cached,
      saveLatestProcessMemory: async () => assert.fail('should not be called if memory'),
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: 'woohoo',
        tags,
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    const res = await loadProcess({ id: PROCESS, to: 1697574792000 }).toPromise()
    assert.deepStrictEqual(res.from, cached.timestamp)
    assert.deepStrictEqual(res.ordinate, cached.ordinate)
    assert.deepStrictEqual(res.fromCron, cached.cron)
    assert.deepStrictEqual(res.fromBlockHeight, cached.blockHeight)
    assert.equal(res.id, PROCESS)
  })

  test('backfill cache if latest from arweave or file', async () => {
    const cached = {
      Memory: Buffer.from('hello world'),
      moduleId: 'module-123',
      timestamp: 1697574792000,
      epoch: 0,
      nonce: 11,
      blockHeight: 123,
      cron: undefined,
      ordinate: '11'
    }

    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      findEvaluation: async () => { throw { status: 404 } },
      findProcessMemoryBefore: async ({ processId, timestamp }) => cached,
      saveLatestProcessMemory: async (args) => {
        assert.deepStrictEqual(args, {
          processId: PROCESS,
          evalCount: 0,
          Memory: cached.Memory,
          moduleId: cached.moduleId,
          timestamp: cached.timestamp,
          epoch: cached.epoch,
          nonce: cached.nonce,
          ordinate: cached.ordinate,
          blockHeight: cached.blockHeight,
          cron: cached.cron
        })
      },
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: 'woohoo',
        tags,
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    cached.src = 'file'
    await loadProcess({ id: PROCESS, to: 1697574792000 }).toPromise()

    cached.src = 'arweave'
    await loadProcess({ id: PROCESS, to: 1697574792000 }).toPromise()
  })

  test('save process to db if fetched from chain', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async (process) => {
        assert.deepStrictEqual(process, {
          id: PROCESS,
          owner: 'woohoo',
          tags,
          block: { height: 123, timestamp: 1697574792000 }
        })
        return PROCESS
      },
      findEvaluation: async () => { throw { status: 404 } },
      findProcessMemoryBefore: async () => ({
        src: 'cold_start',
        Memory: null,
        moduleId: undefined,
        timestamp: undefined,
        epoch: undefined,
        nonce: undefined,
        blockHeight: undefined,
        cron: undefined,
        ordinate: COLLATION_SEQUENCE_MIN_CHAR
      }),
      saveLatestProcessMemory: async () => assert.fail('should not be called on cold_start'),
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: 'woohoo',
        tags,
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    await loadProcess({ id: PROCESS }).toPromise()
  })

  test('gracefully handled failure to save to db', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => { throw { status: 409 } },
      findEvaluation: async () => { throw { status: 404 } },
      findProcessMemoryBefore: async () => ({
        src: 'cold_start',
        Memory: null,
        moduleId: undefined,
        timestamp: undefined,
        epoch: undefined,
        nonce: undefined,
        blockHeight: undefined,
        cron: undefined,
        ordinate: COLLATION_SEQUENCE_MIN_CHAR
      }),
      saveLatestProcessMemory: async () => assert.fail('should not be called on cold_start'),
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: 'woohoo',
        tags,
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    const res = await loadProcess({ id: PROCESS }).toPromise()
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.deepStrictEqual(res.block, { height: 123, timestamp: 1697574792000 })
    assert.equal(res.id, PROCESS)
  })

  test('throw if the Module tag is not provided', async () => {
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      findEvaluation: async () => { throw { status: 404 } },
      findProcessMemoryBefore: async () => ({
        src: 'cold_start',
        Memory: null,
        moduleId: undefined,
        timestamp: undefined,
        epoch: undefined,
        nonce: undefined,
        blockHeight: undefined,
        cron: undefined,
        ordinate: COLLATION_SEQUENCE_MIN_CHAR
      }),
      saveLatestProcessMemory: async () => assert.fail('should not be called on cold_start'),
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: 'woohoo',
        tags: [
          { name: 'Not_Module', value: 'foobar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Process' }
        ],
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    await loadProcess({ id: PROCESS }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.equal(err, "Tag 'Module': was not found on process"))
  })

  test('throw if the Data-Protocol tag is not "ao"', async () => {
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      findEvaluation: async () => { throw { status: 404 } },
      findProcessMemoryBefore: async () => ({
        src: 'cold_start',
        Memory: null,
        moduleId: undefined,
        timestamp: undefined,
        epoch: undefined,
        nonce: undefined,
        blockHeight: undefined,
        cron: undefined,
        ordinate: COLLATION_SEQUENCE_MIN_CHAR
      }),
      saveLatestProcessMemory: async () => assert.fail('should not be called on cold_start'),
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: 'woohoo',
        tags: [
          { name: 'Module', value: 'foobar' },
          { name: 'Data-Protocol', value: 'not_ao' },
          { name: 'Type', value: 'Process' }
        ],
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    await loadProcess({ id: PROCESS }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.equal(err, "Tag 'Data-Protocol': value 'ao' was not found on process"))
  })

  test('throw if the Type tag is not "Process"', async () => {
    const loadProcess = loadProcessWith({
      findProcess: async () => { throw { status: 404 } },
      saveProcess: async () => PROCESS,
      findEvaluation: async () => { throw { status: 404 } },
      findProcessMemoryBefore: async () => ({
        src: 'cold_start',
        Memory: null,
        moduleId: undefined,
        timestamp: undefined,
        epoch: undefined,
        nonce: undefined,
        blockHeight: undefined,
        cron: undefined,
        ordinate: COLLATION_SEQUENCE_MIN_CHAR
      }),
      saveLatestProcessMemory: async () => assert.fail('should not be called on cold_start'),
      locateProcess: async ({ processId: id }) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: 'woohoo',
        tags: [
          { name: 'Module', value: 'foobar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Not_process' }
        ],
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    await loadProcess({ id: PROCESS }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.equal(err, "Tag 'Type': value 'Process' was not found on process"))
  })
})
