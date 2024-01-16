import { describe, test } from 'node:test'
import assert from 'node:assert'

import { determineHostWith } from './domain.js'

const HOSTS = ['http://foo.bar', 'http://fizz.buzz']
const cache = {
  get: () => undefined,
  set: () => undefined
}

describe('domain', () => {
  describe('determineHostWith', () => {
    test('should deterministically return a valid host', () => {
      const determineHost = determineHostWith({ hosts: HOSTS, cache })

      assert(determineHost({ processId: 'process-123', failoverAttempt: 0 }))
      assert.equal(determineHost({ processId: 'process-123', failoverAttempt: 0 }), determineHost({ processId: 'process-123', failoverAttempt: 0 }))
    })

    test('should shift the determined host according to failoverAttempt', () => {
      const determineHost = determineHostWith({ hosts: HOSTS, cache })

      assert.notEqual(determineHost({ processId: 'process-123', failoverAttempt: 0 }), determineHost({ processId: 'process-123', failoverAttempt: 1 }))
    })

    test('should return undefined if all hosts have been attempted', () => {
      const determineHost = determineHostWith({ hosts: HOSTS, cache })
      assert.equal(determineHost({ processId: 'process-123', failoverAttempt: HOSTS.length }), undefined)
    })

    test('should serve from the cache, if found', () => {
      const determineHost = determineHostWith({
        hosts: HOSTS,
        cache: { ...cache, get: () => 10 }
      })

      assert.equal(determineHost({ processId: 'process-123', failoverAttempt: HOSTS.length }), HOSTS[HOSTS.length & 10])
    })
  })
})
