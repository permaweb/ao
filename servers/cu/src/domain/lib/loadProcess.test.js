/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadProcessWith } from './loadProcess.js'
import { omit } from 'ramda'

const PROCESS = 'process-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadProcess', () => {
  test('appends process owner, tags, block, buffer as process tags parsed as JSON, result, from, and evaluatedAt to ctx', async () => {
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
      findLatestEvaluation: async () => { throw { status: 404 } },
      locateScheduler: async (id) => {
        assert.equal(id, PROCESS)
        return { url: 'https://foo.bar' }
      },
      loadProcess: async ({ suUrl, processId }) => {
        assert.equal(processId, PROCESS)
        assert.equal(suUrl, 'https://foo.bar')
        return {
          owner: 'woohoo',
          tags,
          block: { height: 123, timestamp: 1697574792000 }
        }
      },
      logger
    })

    const res = await loadProcess({ id: PROCESS, to: 'sortkey-123' }).toPromise()
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.deepStrictEqual(res.block, { height: 123, timestamp: 1697574792000 })
    assert.deepStrictEqual(res.buffer, null)
    assert.deepStrictEqual(res.result, {
      messages: [],
      output: '',
      spawns: []
    })
    assert.equal(res.from, undefined)
    assert.equal(res.evaluatedAt, undefined)
    assert.equal(res.id, PROCESS)
  })

  test('use process from db to set owner, tags, and block', async () => {
    const tags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Process' },
      { name: 'Foo', value: 'Bar' }
    ]
    const loadProcess = loadProcessWith({
      findProcess: async () => ({
        id: PROCESS,
        owner: 'woohoo',
        tags,
        block: { height: 123, timestamp: 1697574792 }
      }),
      saveProcess: async () => assert.fail('should not save if found in db'),
      findLatestEvaluation: async () => { throw { status: 404 } },
      locateScheduler: async (_id) => assert.fail('should not locate su if found in db'),
      loadProcess: async (_id) => assert.fail('should not load process block if found in db'),
      logger
    })

    const res = await loadProcess({ id: PROCESS }).toPromise()
    assert.deepStrictEqual(res.tags, tags)
    assert.deepStrictEqual(res.owner, 'woohoo')
    assert.deepStrictEqual(res.block, { height: 123, timestamp: 1697574792 })
    assert.equal(res.id, PROCESS)
  })

  test('use latest evaluation from db to set buffer, result, from, and evaluatedAt on ctx', async () => {
    const cachedEvaluation = {
      sortKey: 'sortkey-123',
      processId: PROCESS,
      evaluatedAt: new Date(),
      message: {
        tags: [
          { name: 'message', value: 'tags' }
        ]
      },
      output: {
        buffer: Buffer.from('Hello', 'utf-8'),
        messages: [
          {
            target: 'foobar',
            tags: [
              { name: 'foo', value: 'bar' }
            ]
          }
        ],
        output: [],
        spawns: []
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
      findLatestEvaluation: async ({ processId, to }) => {
        assert.equal(processId, PROCESS)
        assert.equal(to, 'sortkey-123')
        return cachedEvaluation
      },
      locateScheduler: async (id) => ({ url: 'https://foo.bar' }),
      loadProcess: async (id) => ({
        owner: 'woohoo',
        tags,
        block: { height: 123, timestamp: 1697574792000 }
      }),
      logger
    })

    const res = await loadProcess({ id: PROCESS, to: 'sortkey-123' }).toPromise()
    assert.deepStrictEqual(res.buffer, cachedEvaluation.output.buffer)
    assert.deepStrictEqual(res.result, omit(['buffer'], cachedEvaluation.output))
    assert.deepStrictEqual(res.from, cachedEvaluation.sortKey)
    assert.deepStrictEqual(res.evaluatedAt, cachedEvaluation.evaluatedAt)
    assert.equal(res.id, PROCESS)
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
      findLatestEvaluation: async () => { throw { status: 404 } },
      locateScheduler: async (id) => ({ url: 'https://foo.bar' }),
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
      findLatestEvaluation: async () => { throw { status: 404 } },
      locateScheduler: async (id) => ({ url: 'https://foo.bar' }),
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
      findLatestEvaluation: async () => { throw { status: 404 } },
      locateScheduler: async (id) => ({ url: 'https://foo.bar' }),
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
      findLatestEvaluation: async () => { throw { status: 404 } },
      locateScheduler: async (id) => ({ url: 'https://foo.bar' }),
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
      findLatestEvaluation: async () => { throw { status: 404 } },
      locateScheduler: async (id) => ({ url: 'https://foo.bar' }),
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
