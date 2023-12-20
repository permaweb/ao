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
    const getByProcess = getByProcessWith({ cache })
    test('returns the url if in cache', async () => {
      assert.equal(await getByProcess(PROCESS), undefined)
      cache.set(PROCESS, { url: DOMAIN, address: SCHEDULER })
      assert.deepStrictEqual(await getByProcess(PROCESS), { url: DOMAIN, address: SCHEDULER })
    })
  })

  describe('getByOwnerWith', () => {
    const getByOwner = getByOwnerWith({ cache })
    test('returns the url if in cache', async () => {
      assert.equal(await getByOwner(SCHEDULER), undefined)
      cache.set(SCHEDULER, { url: DOMAIN, address: SCHEDULER })
      assert.deepStrictEqual(await getByOwner(SCHEDULER), { url: DOMAIN, address: SCHEDULER })
    })
  })

  describe('setByProcessWith', () => {
    const setByProcess = setByProcessWith({ cache })
    test('sets the value in cache', async () => {
      await setByProcess(PROCESS, DOMAIN, TEN_MS)
      assert.ok(cache.has(PROCESS))
    })
  })

  describe('setByOwnerWith', () => {
    const setByOwner = setByOwnerWith({ cache })
    test('sets the value in cache', async () => {
      await setByOwner(SCHEDULER, DOMAIN, TEN_MS)
      assert.ok(cache.has(SCHEDULER))
    })
  })
})
