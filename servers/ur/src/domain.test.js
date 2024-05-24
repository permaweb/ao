import { describe, test } from 'node:test'
import assert from 'node:assert'

import { determineHostWith, bailoutWith } from './domain.js'

const HOSTS = ['http://foo.bar', 'http://fizz.buzz']
const cache = {
  get: () => undefined,
  set: () => undefined
}

describe('domain', () => {
  describe('determineHostWith', () => {
    test('should deterministically return a valid host', async () => {
      const determineHost = determineHostWith({ hosts: HOSTS, cache })

      assert(await determineHost({ processId: 'process-123', failoverAttempt: 0 }))
      assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: 0 }), await determineHost({ processId: 'process-123', failoverAttempt: 0 }))
    })

    test('should shift the determined host according to failoverAttempt', async () => {
      const determineHost = determineHostWith({ hosts: HOSTS, cache })

      assert.notEqual(await determineHost({ processId: 'process-123', failoverAttempt: 0 }), await determineHost({ processId: 'process-123', failoverAttempt: 1 }))
    })

    test('should return undefined if all hosts have been attempted', async () => {
      const determineHost = determineHostWith({ hosts: HOSTS, cache })
      assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: HOSTS.length }), undefined)
    })

    test('should serve from the cache, if found', async () => {
      const determineHost = determineHostWith({
        hosts: HOSTS,
        cache: { ...cache, get: () => 10 }
      })

      assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: HOSTS.length }), HOSTS[HOSTS.length & 10])
    })

    test('should redirect to the subrouterUrl', async () => {
      const fetchMock = async (url) => {
        assert.equal(url, 'surUrl1/processes/process-123')
        return new Response(JSON.stringify({ owner: { address: 'owner2' } }))
      }

      const bailout = bailoutWith({
        fetch: fetchMock,
        surUrl: 'surUrl1',
        subrouterUrl: 'subrouterUrl1',
        owners: ['owner1', 'owner2']
      })

      const determineHost = determineHostWith({ hosts: HOSTS, cache, bailout })

      assert(await determineHost({ processId: 'process-123', failoverAttempt: 0 }))
      assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: 0 }), 'subrouterUrl1')
    })

    test('should not redirect to the subrouterUrl', async () => {
      const fetchMock = async (url) => {
        assert.equal(url, 'surUrl1/processes/process-123')
        /**
         * Here the owner does not match any in the list
         * this will cause it to not redirect to the subrouter
         */
        return new Response(JSON.stringify({ owner: { address: 'owner3' } }))
      }

      const bailout = bailoutWith({
        fetch: fetchMock,
        surUrl: 'surUrl1',
        subrouterUrl: 'subrouterUrl1',
        owners: ['owner1', 'owner2']
      })

      const determineHost = determineHostWith({ hosts: HOSTS, cache, bailout })

      assert(await determineHost({ processId: 'process-123', failoverAttempt: 0 }))
      assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: 0 }), 'http://foo.bar')
    })
  })
})
