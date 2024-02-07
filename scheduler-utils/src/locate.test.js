import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { locateWith } from './locate.js'

const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'
const SCHEDULER = 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
const DOMAIN = 'https://foo.bar'
const DOMAIN_REDIRECT = 'https://foo-redirect.bar'
const TEN_MS = 10

describe('locateWith', () => {
  test('should load the value and cache it', async () => {
    const locate = locateWith({
      loadProcessScheduler: async (process) => {
        assert.equal(process, PROCESS)
        return { url: DOMAIN, ttl: TEN_MS, owner: SCHEDULER }
      },
      cache: {
        getByProcess: async (process) => {
          assert.equal(process, PROCESS)
          return undefined
        },
        setByProcess: async (process, { url, address }, ttl) => {
          assert.equal(process, PROCESS)
          assert.equal(url, DOMAIN)
          assert.equal(address, SCHEDULER)
          assert.equal(ttl, TEN_MS)
        },
        setByOwner: async (owner, url, ttl) => {
          assert.equal(owner, SCHEDULER)
          assert.equal(url, DOMAIN)
          assert.equal(ttl, TEN_MS)
        }
      },
      followRedirects: false
    })

    await locate(PROCESS)
      .then((res) => assert.deepStrictEqual(res, { url: DOMAIN, address: SCHEDULER }))
  })

  test('should serve the cached value', async () => {
    const locate = locateWith({
      loadProcessScheduler: async () => {
        assert.fail('should never call on chain if in cache')
      },
      cache: {
        getByProcess: async (process) => {
          assert.equal(process, PROCESS)
          return { url: DOMAIN, address: SCHEDULER }
        }
      }
    })

    await locate(PROCESS)
      .then((res) => assert.deepStrictEqual(res, { url: DOMAIN, address: SCHEDULER }))
  })

  test('should load the redirected value and cache it', async () => {
    const locate = locateWith({
      loadProcessScheduler: async (process) => {
        assert.equal(process, PROCESS)
        return { url: DOMAIN, ttl: TEN_MS, owner: SCHEDULER }
      },
      cache: {
        getByProcess: async (process) => {
          assert.equal(process, PROCESS)
          return undefined
        },
        setByProcess: async (process, { url, address }, ttl) => {
          assert.equal(process, PROCESS)
          assert.equal(url, DOMAIN_REDIRECT)
          assert.equal(address, SCHEDULER)
          assert.equal(ttl, TEN_MS)
        },
        setByOwner: async (owner, url, ttl) => {
          assert.equal(owner, SCHEDULER)
          assert.equal(url, DOMAIN_REDIRECT)
          assert.equal(ttl, TEN_MS)
        }
      },
      followRedirects: true,
      checkForRedirect: async (url, process) => {
        assert.equal(process, PROCESS)
        assert.equal(url, DOMAIN)
        return DOMAIN_REDIRECT
      }
    })

    await locate(PROCESS)
      .then((res) => assert.deepStrictEqual(res, { url: DOMAIN_REDIRECT, address: SCHEDULER }))
  })
})
