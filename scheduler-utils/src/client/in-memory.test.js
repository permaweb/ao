import { describe, test, beforeEach } from 'node:test'
import * as assert from 'node:assert'

import { createLruCache, getByProcessWith, getByOwnerWith, setByProcessWith, setByOwnerWith } from './in-memory.js'

const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'
const SCHEDULER = 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
const DOMAIN = 'https://foo.bar'
const TEN_MS = 10
const SIZE = 10

describe('in-memory', () => {
  const cache = createLruCache({ size: SIZE })

  beforeEach(() => {
    cache.clear()
  })

  describe('getByProcessWith', () => {
    test('returns the url if in cache', async () => {
      const getByProcess = getByProcessWith({ cache })
      assert.equal(await getByProcess(PROCESS), undefined)
      cache.set(PROCESS, { url: DOMAIN, address: SCHEDULER })
      assert.deepStrictEqual(await getByProcess(PROCESS), { url: DOMAIN, address: SCHEDULER })
    })

    test('returns undefined if cache size is set to 0', async () => {
      const getByProcess = getByProcessWith({ cache: createLruCache({ size: 0 }) })
      assert.equal(await getByProcess(PROCESS), undefined)
      cache.set(PROCESS, { url: DOMAIN, address: SCHEDULER })
      assert.deepStrictEqual(await getByProcess(PROCESS), undefined)
    })
  })

  describe('getByOwnerWith', () => {
    test('returns the url if in cache', async () => {
      const getByOwner = getByOwnerWith({ cache })
      assert.equal(await getByOwner(SCHEDULER), undefined)
      cache.set(SCHEDULER, { url: DOMAIN, address: SCHEDULER })
      assert.deepStrictEqual(await getByOwner(SCHEDULER), { url: DOMAIN, address: SCHEDULER })
    })

    test('returns undefined if cache size is set to 0', async () => {
      const getByOwner = getByOwnerWith({ cache: createLruCache({ size: 0 }) })
      assert.equal(await getByOwner(SCHEDULER), undefined)
      cache.set(SCHEDULER, { url: DOMAIN, address: SCHEDULER })
      assert.deepStrictEqual(await getByOwner(SCHEDULER), undefined)
    })
  })

  describe('setByProcessWith', () => {
    test('sets the value in cache', async () => {
      const setByProcess = setByProcessWith({ cache })
      await setByProcess(PROCESS, DOMAIN, TEN_MS)
      assert.ok(cache.has(PROCESS))
    })

    test('does nothing if cache size is set to 0', async () => {
      const setByProcess = setByProcessWith({ cache: createLruCache({ size: 0 }) })
      await setByProcess(PROCESS, DOMAIN, TEN_MS)
      assert.ok(!cache.has(PROCESS))
    })
  })

  describe('setByOwnerWith', () => {
    test('sets the value in cache', async () => {
      const setByOwner = setByOwnerWith({ cache })
      await setByOwner(SCHEDULER, DOMAIN, TEN_MS)
      assert.ok(cache.has(SCHEDULER))
    })

    test('does nothing if cache size is set to 0', async () => {
      const setByOwner = setByOwnerWith({ cache: createLruCache({ size: 0 }) })
      await setByOwner(SCHEDULER, DOMAIN, TEN_MS)
      assert.ok(!cache.has(SCHEDULER))
    })
  })
})
