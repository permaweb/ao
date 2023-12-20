import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { locateWith } from './locate.js'

const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'
const SCHEDULER = 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
const DOMAIN = 'https://foo.bar'
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
      }
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
})
