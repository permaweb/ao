import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { rawWith } from './raw.js'
import { InvalidSchedulerLocationError } from './err.js'

const SCHEDULER = 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
const DOMAIN = 'https://foo.bar'
const TEN_MS = 10

describe('rawWith', () => {
  describe('should return the raw Scheduler-Location', () => {
    test('found', async () => {
      const raw = rawWith({
        loadScheduler: async (walletAddress) => {
          assert.equal(walletAddress, SCHEDULER)
          return { url: DOMAIN, ttl: TEN_MS, address: SCHEDULER }
        },
        cache: {
          getByOwner: async (scheduler) => {
            assert.equal(scheduler, SCHEDULER)
            return undefined
          },
          setByOwner: async (owner, url, ttl) => {
            assert.equal(owner, SCHEDULER)
            assert.equal(url, DOMAIN)
            assert.equal(ttl, TEN_MS)
          }
        }
      })

      await raw(SCHEDULER)
        .then(res => assert.deepStrictEqual(res, { url: DOMAIN }))
    })

    test('not found', async () => {
      const raw = rawWith({
        loadScheduler: async (walletAddress) => {
          assert.equal(walletAddress, SCHEDULER)
          throw new InvalidSchedulerLocationError('Big womp')
        },
        cache: {
          getByOwner: async (scheduler) => {
            assert.equal(scheduler, SCHEDULER)
            return undefined
          },
          setByOwner: async () => assert.fail('should not call if not scheduler is found')
        }
      })

      await raw(SCHEDULER)
        .then((valid) => assert.equal(valid, undefined))
    })
  })

  test('should use the cached value', async () => {
    const raw = rawWith({
      loadScheduler: async () => {
        assert.fail('should never call on chain if in cache')
      },
      cache: {
        getByOwner: async (walletAddress) => {
          assert.equal(walletAddress, SCHEDULER)
          return { url: DOMAIN, address: SCHEDULER, ttl: 10 }
        },
        setByOwner: async () => assert.fail('should not call if not scheduler is in cache')
      }
    })

    await raw(SCHEDULER)
      .then(assert.ok)
  })
})
