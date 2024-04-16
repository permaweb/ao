import { test } from 'node:test'
import assert from 'node:assert'
import { checkForRedirectWith } from './scheduler.js'
import { checkForRedirectSchema } from '../dal.js'

const mockFetch = (url, options) => {
  if (options.method === 'GET' && !url.includes('no-redirect')) {
    return Promise.resolve({
      status: 302,
      headers: {
        get: (header) => {
          if (header === 'Location') return 'http://newlocation.com?process-id=123'
        }
      }
    })
  }
  return Promise.resolve({
    status: 200,
    headers: {
      get: (_header) => null
    }
  })
}

test('checkForRedirectWith should return new location on redirect', async (_t) => {
  const checkForRedirect = checkForRedirectSchema.implement(
    checkForRedirectWith({ fetch: mockFetch })
  )
  const result = await checkForRedirect('http://example.com/redirect', 'test-process')
  assert.strictEqual(result, 'http://newlocation.com', 'The function should return the new location URL on redirect')
})

test('checkForRedirectWith should return original URL if no redirect', async (_t) => {
  const checkForRedirect = checkForRedirectSchema.implement(
    checkForRedirectWith({ fetch: mockFetch })
  )
  const result = await checkForRedirect('http://example.com/no-redirect', 'test-process')
  assert.strictEqual(result, 'http://example.com/no-redirect', 'The function should return the original URL if there is no redirect')
})
