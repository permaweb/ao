import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { getByOwnerSchema, getByProcessSchema, setByOwnerSchema, setByProcessSchema } from '../dal.js'
import { createLruCache, getByProcessWith, getByOwnerWith, setByProcessWith, setByOwnerWith } from './in-memory.js'

const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'
const SCHEDULER = 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
const DOMAIN = 'https://foo.bar'
const TEN_MS = 10
const SIZE = 10

describe('in-memory', () => {
  describe('getByProcessWith', () => {
    test('returns the cached entry', async () => {
      const cache = createLruCache({ size: SIZE })
      const getByProcess = getByProcessSchema.implement(getByProcessWith({ cache }))
      assert.equal(await getByProcess(PROCESS), undefined)
      cache.set(PROCESS, { url: DOMAIN, address: SCHEDULER })
      assert.deepStrictEqual(await getByProcess(PROCESS), { url: DOMAIN, address: SCHEDULER })
    })

    test('returns undefined if cache size is set to 0', async () => {
      const cache = createLruCache({ size: 0 })
      const getByProcess = getByProcessSchema.implement(getByProcessWith({ cache }))
      assert.equal(await getByProcess(PROCESS), undefined)
      cache.set(PROCESS, { url: DOMAIN, address: SCHEDULER })
      assert.deepStrictEqual(await getByProcess(PROCESS), undefined)
    })
  })

  describe('getByOwnerWith', () => {
    test('returns the cached entry', async () => {
      const cache = createLruCache({ size: SIZE })
      const getByOwner = getByOwnerSchema.implement(
        getByOwnerWith({ cache })
      )
      assert.equal(await getByOwner(SCHEDULER), undefined)
      cache.set(SCHEDULER, { url: DOMAIN, address: SCHEDULER, ttl: 10 })
      assert.deepStrictEqual(await getByOwner(SCHEDULER), { url: DOMAIN, address: SCHEDULER, ttl: 10 })
    })

    test('returns undefined if cache size is set to 0', async () => {
      const cache = createLruCache({ size: 0 })
      const getByOwner = getByOwnerSchema.implement(getByOwnerWith({ cache }))
      assert.equal(await getByOwner(SCHEDULER), undefined)
      cache.set(SCHEDULER, { url: DOMAIN, address: SCHEDULER, ttl: 10 })
      assert.deepStrictEqual(await getByOwner(SCHEDULER), undefined)
    })
  })

  describe('setByProcessWith', () => {
    test('sets the value in cache', async () => {
      const cache = createLruCache({ size: SIZE })
      const setByProcess = setByProcessSchema.implement(setByProcessWith({ cache }))
      await setByProcess(PROCESS, { url: DOMAIN, address: SCHEDULER }, TEN_MS)
      assert.deepStrictEqual(cache.get(PROCESS), { url: DOMAIN, address: SCHEDULER })
    })

    test('does nothing if cache size is set to 0', async () => {
      const cache = createLruCache({ size: 0 })
      const setByProcess = setByProcessSchema.implement(setByProcessWith({ cache }))
      await setByProcess(PROCESS, { url: DOMAIN, address: SCHEDULER }, TEN_MS)
      assert.ok(!cache.has(PROCESS))
    })
  })

  describe('setByOwnerWith', () => {
    test('sets the value in cache', async () => {
      const cache = createLruCache({ size: SIZE })
      const setByOwner = setByOwnerSchema.implement(setByOwnerWith({ cache }))
      await setByOwner(SCHEDULER, DOMAIN, TEN_MS)
      assert.deepStrictEqual(cache.get(SCHEDULER), { url: DOMAIN, address: SCHEDULER, ttl: TEN_MS })
    })

    test('does nothing if cache size is set to 0', async () => {
      const cache = createLruCache({ size: 0 })
      const setByOwner = setByOwnerSchema.implement(setByOwnerWith({ cache }))
      await setByOwner(SCHEDULER, DOMAIN, TEN_MS)
      assert.ok(!cache.has(SCHEDULER))
    })
  })
})
