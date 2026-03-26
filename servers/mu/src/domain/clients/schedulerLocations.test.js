import { describe, test, before, after } from 'node:test'
import * as assert from 'node:assert'
import { unlinkSync } from 'node:fs'

import { createSqliteClient } from './sqlite.js'
import { schedulerLocationsWith } from './schedulerLocations.js'

const GRAPHQL_URL = 'https://arweave-search.goldsky.com/graphql'
const ARWEAVE_URL = 'https://arweave.net'
const DB_URL = '/tmp/scheduler-locations-test'

const logger = (...args) => console.log(...args)
logger.child = (name) => {
  const child = (...args) => console.log(`[${name}]`, ...args)
  child.child = (n) => logger.child(`${name}:${n}`)
  return child
}

describe('schedulerLocations integration', () => {
  let instance

  before(async () => {
    // bootstrap the database so tables exist
    await createSqliteClient({ url: `${DB_URL}.sqlite`, bootstrap: true, type: 'tasks' })

    instance = await schedulerLocationsWith({
      GRAPHQL_URL,
      ARWEAVE_URL,
      DB_URL,
      logger
    })
  })

  after(() => {
    try { unlinkSync(`${DB_URL}.sqlite`) } catch (_) {}
    try { unlinkSync(`${DB_URL}.sqlite-wal`) } catch (_) {}
    try { unlinkSync(`${DB_URL}.sqlite-shm`) } catch (_) {}
    // force exit to kill the background cron scheduled by schedulerLocationsWith
    setTimeout(() => process.exit(0), 100)
  })

  test('raw() returns a url for a known scheduler address', async () => {
    // _GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA is the main ao scheduler
    const result = await instance.raw('_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA')
    console.log('raw() result:', result)
    assert.ok(result, 'should return a result')
    assert.ok(result.url, 'should have a url')
    assert.ok(!result.url.endsWith('/'), 'url should not have trailing slash')
  })

  test('raw() returns undefined for unknown address', async () => {
    const result = await instance.raw('nonexistent-address-that-does-not-exist')
    assert.strictEqual(result, undefined)
  })

  test('getProcess() fetches and parses a process from arweave', async () => {
    const process = await instance.getProcess('0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc')
    console.log('getProcess() result:', JSON.stringify(process, null, 2))
    assert.ok(process, 'should return a process')
    assert.strictEqual(process.id, '0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc')
    assert.ok(Array.isArray(process.tags), 'should have tags array')
    assert.ok(process.tags.length > 0, 'should have at least one tag')

    const schedulerTag = process.tags.find(t => t.name === 'Scheduler')
    assert.ok(schedulerTag, 'should have a Scheduler tag')
    console.log('Scheduler tag:', schedulerTag.value)
  })

  test('getProcess() returns cached result on second call', async () => {
    const start = Date.now()
    const process = await instance.getProcess('0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc')
    const elapsed = Date.now() - start
    console.log(`getProcess() cached call took ${elapsed}ms`)
    assert.ok(process, 'should return cached process')
    assert.ok(elapsed < 50, 'cached lookup should be fast')
  })

  test('getProcess() returns undefined for nonexistent process', async () => {
    const process = await instance.getProcess('0000000000000000000000000000000000000000000')
    assert.strictEqual(process, undefined)
  })

  test('locate() resolves url and address for a known process', async () => {
    const result = await instance.locate('0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc')
    console.log('locate() result:', result)
    assert.ok(result, 'should return a result')
    assert.ok(result.url, 'should have a url')
    assert.ok(result.address, 'should have an address')
    assert.ok(!result.url.endsWith('/'), 'url should not have trailing slash')
  })

  test('locate() works with a schedulerHint', async () => {
    const result = await instance.locate(
      '0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc',
      '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA'
    )
    console.log('locate() with hint result:', result)
    assert.ok(result.url, 'should have a url')
    assert.strictEqual(result.address, '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA')
  })

  test('locate() throws for nonexistent process', async () => {
    await assert.rejects(
      () => instance.locate('0000000000000000000000000000000000000000000'),
      /Process not found/
    )
  })
})
