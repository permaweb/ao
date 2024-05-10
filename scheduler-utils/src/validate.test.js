import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { validateWith } from './validate.js'
import { InvalidSchedulerLocationError } from './err.js'

const SCHEDULER = 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
const DOMAIN = 'https://foo.bar'
const TEN_MS = 10

describe('validateWith', () => {
  describe('should validate whether the wallet address owns a valid Scheduler-Location', () => {
    test('valid', async () => {
      const validate = validateWith({
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

      await validate(SCHEDULER)
        .then(assert.ok)
    })

    test('not valid', async () => {
      const validate = validateWith({
        loadScheduler: async (walletAddress) => {
          assert.equal(walletAddress, SCHEDULER)
          throw new InvalidSchedulerLocationError('Big womp')
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

      await validate(SCHEDULER)
        .then((valid) => assert.equal(valid, false))
    })
  })

  test('should use the cached value', async () => {
    const validate = validateWith({
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

    await validate(SCHEDULER)
      .then(assert.ok)
  })
})
