import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { backoff, trimSlash } from './utils.js'

describe('trimSlash', () => {
  test('should remove trailing slash from url', () => {
    const resultWithTrailingSlash = trimSlash('https://foo.bar/')
    assert.equal(resultWithTrailingSlash, 'https://foo.bar')
    const resultWithoutTrailingSlash = trimSlash('https://foo.bar')
    assert.equal(resultWithoutTrailingSlash, 'https://foo.bar')
  })
})

describe('backoff', () => {
  function isPromise (obj) {
    return (
      !!obj &&
      (typeof obj === 'object' || typeof obj === 'function') &&
      typeof obj.then === 'function'
    )
  }

  test('should return a promise', () => {
    assert.ok(isPromise(
      backoff(() => Promise.resolve(''), {
        maxRetries: 0,
        delay: 0
      })
    ))

    assert.ok(isPromise(
      backoff(() => '', {
        maxRetries: 0,
        delay: 0
      })
    ))
  })

  test('should not retry calling the function', async () => {
    let count = 0
    const fn = () => count++
    await backoff(fn, {
      maxRetries: 0,
      delay: 0
    })

    assert.equal(count, 1)
  })

  test('should retry calling the function', async () => {
    let count = 0
    const fn = () => {
      count++
      return count
        ? Promise.resolve('foo')
        // eslint-disable-next-line
        : Promise.reject('bar')
    }

    const res = await backoff(fn, {
      maxRetries: 1,
      delay: 0
    })

    assert.equal(res, 'foo')
  })

  test('should bubble the error if all retries are unsuccessful', async () => {
    let count = 0
    const fn = () => {
      count++
      // eslint-disable-next-line
      return Promise.reject('bar')
    }

    await backoff(fn, {
      maxRetries: 2,
      delay: 0
    }).catch(err => {
      assert.equal(err, 'bar')
      assert.equal(count, 3)
    })
  })
})
