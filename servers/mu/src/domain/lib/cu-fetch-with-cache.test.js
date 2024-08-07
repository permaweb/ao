import * as assert from 'node:assert'
import { describe, test } from 'node:test'

import * as InMemoryClient from '../clients/in-memory.js'
import { cuFetchWithCache } from './cu-fetch-with-cache.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}
logger.child = () => {
  const tempLogger = () => undefined
  tempLogger.tap = () => (args) => {
    return args
  }
  return tempLogger
}

describe('cuFetchWithCache', () => {
  test('fetch works as it normally does', async () => {
    const cache = InMemoryClient.createLruCache({ size: 1 })
    const fetchWithCache = cuFetchWithCache({
      cache,
      fetch: async () => {
        return new Response(
          JSON.stringify({
            message: 'Hello, world!'
          })
        )
      },
      logger
    })

    const response = await fetchWithCache('https://foo.bar')

    assert.deepStrictEqual(await response.json(), {
      message: 'Hello, world!'
    })
    assert.equal(cache.size, 0)
  })

  test('redirect response is cached', async () => {
    const cache = InMemoryClient.createLruCache({ size: 1 })
    const processId = '123'
    const fetchWithCache = cuFetchWithCache({
      cache,
      fetch: async (url) => {
        if (url.startsWith('https://foo.bar')) {
          return new Response(null, {
            status: 307,
            headers: {
              Location: 'https://bar.baz'
            }
          })
        }
        return new Response(
          JSON.stringify({
            message: 'Hello, world!'
          })
        )
      },
      logger
    })

    const response = await fetchWithCache(`https://foo.bar?process-id=${processId}`)

    assert.deepStrictEqual(await response.json(), {
      message: 'Hello, world!'
    })
    assert.equal(cache.get(processId), 'bar.baz')
  })
})
