import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { z } from 'zod'
import ms from 'ms'

import {
  busyIn, errFrom, evaluationToCursor, findPendingForProcessBeforeWith, maybeParseCursor,
  removeTagsByNameMaybeValue, joinUrl, preprocessUrls, backoff
} from './utils.js'

describe('utils', () => {
  describe('joinUrl', () => {
    test('should return the url', () => {
      assert.equal(joinUrl({ url: 'https://arweave.net/graphql' }), 'https://arweave.net/graphql')
      assert.equal(joinUrl({ url: 'https://arweave.net/graphql?foo=bar' }), 'https://arweave.net/graphql?foo=bar')
      assert.equal(joinUrl({ url: 'https://arweave.net/graphql', path: undefined }), 'https://arweave.net/graphql')
    })

    test('should append the path', () => {
      assert.equal(joinUrl({ url: 'https://arweave.net', path: 'graphql' }), 'https://arweave.net/graphql')
      assert.equal(joinUrl({ url: 'https://arweave.net', path: '/graphql' }), 'https://arweave.net/graphql')
      assert.equal(joinUrl({ url: 'https://arweave.net/', path: 'graphql' }), 'https://arweave.net/graphql')
      assert.equal(joinUrl({ url: 'https://arweave.net/', path: '/graphql' }), 'https://arweave.net/graphql')

      assert.equal(joinUrl({ url: 'https://arweave.net?foo=bar', path: 'graphql' }), 'https://arweave.net/graphql?foo=bar')
      assert.equal(joinUrl({ url: 'https://arweave.net?foo=bar', path: '/graphql' }), 'https://arweave.net/graphql?foo=bar')
      assert.equal(joinUrl({ url: 'https://arweave.net/?foo=bar', path: 'graphql' }), 'https://arweave.net/graphql?foo=bar')
      assert.equal(joinUrl({ url: 'https://arweave.net/?foo=bar', path: '/graphql' }), 'https://arweave.net/graphql?foo=bar')
    })
  })

  describe('preprocessUrls', () => {
    const GATEWAY_URL = 'https://foo.bar'
    const ARWEAVE_URL = 'https://arweave.net'
    const GRAPHQL_URL = 'https://my.custom/graphql'
    const CHECKPOINT_GRAPHQL_URL = 'https://my.other/graphql'

    test('should use the provided values', () => {
      const config = preprocessUrls({ GATEWAY_URL, ARWEAVE_URL, GRAPHQL_URL, CHECKPOINT_GRAPHQL_URL })
      assert.equal(config.ARWEAVE_URL, ARWEAVE_URL)
      assert.equal(config.GRAPHQL_URL, GRAPHQL_URL)
      assert.equal(config.CHECKPOINT_GRAPHQL_URL, CHECKPOINT_GRAPHQL_URL)
    })

    test('should use the provided GATEWAY_URL to default ARWEAVE_URL and GRAPHQL_URL', () => {
      const noArweaveUrl = preprocessUrls({ GATEWAY_URL, GRAPHQL_URL })
      assert.equal(noArweaveUrl.ARWEAVE_URL, GATEWAY_URL)
      assert.equal(noArweaveUrl.GRAPHQL_URL, GRAPHQL_URL)

      const noGraphQlUrl = preprocessUrls({ GATEWAY_URL, ARWEAVE_URL })
      assert.equal(noGraphQlUrl.GRAPHQL_URL, `${GATEWAY_URL}/graphql`)
      assert.equal(noGraphQlUrl.ARWEAVE_URL, ARWEAVE_URL)

      const neither = preprocessUrls({ GATEWAY_URL })
      assert.equal(neither.GRAPHQL_URL, `${GATEWAY_URL}/graphql`)
      assert.equal(neither.ARWEAVE_URL, GATEWAY_URL)
    })

    test('should default CHECKPOINT_GRAPHQL_URL to GRAPHQL_URL', () => {
      const noGraphQlUrl = preprocessUrls({ GATEWAY_URL, ARWEAVE_URL })
      assert.equal(noGraphQlUrl.CHECKPOINT_GRAPHQL_URL, noGraphQlUrl.GRAPHQL_URL)
      assert.equal(noGraphQlUrl.CHECKPOINT_GRAPHQL_URL, `${GATEWAY_URL}/graphql`)

      const config = preprocessUrls({ ARWEAVE_URL, GRAPHQL_URL })
      assert.ok(config.CHECKPOINT_GRAPHQL_URL)
      assert.equal(config.CHECKPOINT_GRAPHQL_URL, config.GRAPHQL_URL)
    })
  })

  describe('errFrom', () => {
    test('should map ZodError to a friendly error', async () => {
      const schema = z.function().args(z.object({ name: z.string() })).returns(
        z.promise(z.object({ ok: z.boolean() }))
      )

      const fn = schema.validate(function wrongReturn () {
        return Promise.resolve({ not: 'ok' })
      })

      const err = await fn({ name: 'string' }).catch(errFrom)

      assert.equal(err.message, 'Invalid Return \'ok\': Required.')

      const errWrongArgs = await fn({ name: 123 }).catch(errFrom)

      assert.equal(
        errWrongArgs.message,
        'Invalid Arguments \'name\': Expected string, received number.'
      )
    })

    test('should map regular error', async () => {
      const err = await Promise.reject(new Error('woops')).catch(errFrom)
      assert.equal(err.message, 'woops')
    })

    test('should map regular object', async () => {
      // eslint-disable-next-line
      const err = await Promise.reject({ message: 'woops' }).catch(errFrom)
      assert.equal(err.message, 'woops')
    })

    test('should map regular string', async () => {
      // eslint-disable-next-line
      const err = await Promise.reject('woops').catch(errFrom)
      assert.equal(err.message, 'woops')
    })

    test('should use the default message', async () => {
      // eslint-disable-next-line
      const err = await Promise.reject([]).catch(errFrom)
      assert.equal(err.message, 'An error occurred')
    })
  })

  describe('removeTagsByNameMaybeValue', () => {
    const tags = [
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Variant', value: 'ao.TN.1' },
      { name: 'Type', value: 'Message' },
      { name: 'Type', value: 'Foo' },
      { name: 'SDK', value: 'aoconnect' }
    ]

    test('should remove the tags by name', () => {
      assert.deepStrictEqual(
        removeTagsByNameMaybeValue('Type')(tags),
        [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Variant', value: 'ao.TN.1' },
          { name: 'SDK', value: 'aoconnect' }
        ]
      )
    })

    test('should remove the tags by name and value', () => {
      assert.deepStrictEqual(
        removeTagsByNameMaybeValue('Type', 'Foo')(tags),
        [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Variant', value: 'ao.TN.1' },
          { name: 'Type', value: 'Message' },
          { name: 'SDK', value: 'aoconnect' }
        ]
      )
    })
  })

  describe('evaluationToCursor', () => {
    test('should create cursor from evaluation and sort direction', () => {
      const now = new Date().getTime()

      assert.deepStrictEqual(
        JSON.parse(atob(evaluationToCursor({ timestamp: now, ordinate: '3', cron: '1-10-minutes' }, 'ASC'))),
        { timestamp: now, ordinate: '3', cron: '1-10-minutes', sort: 'ASC' }
      )
    })
  })

  describe('maybeParseCursor', () => {
    test('should parse the cursor into criteria and attach to ctx', async () => {
      const now = new Date().getTime()

      const res = await maybeParseCursor('from')({
        foo: 'bar',
        from: evaluationToCursor({ timestamp: now, ordinate: '3', cron: '1-10-minutes' }, 'ASC')
      }).toPromise()

      assert.deepStrictEqual(res, {
        foo: 'bar',
        from: { timestamp: now, ordinate: '3', cron: '1-10-minutes', sort: 'ASC' }
      })
    })

    test('should set as timestamp if failed to parse criteria from cursor', async () => {
      const now = new Date().getTime()

      const res = await maybeParseCursor('from')({
        foo: 'bar',
        from: now
      }).toPromise()

      assert.deepStrictEqual(res, {
        foo: 'bar',
        from: { timestamp: now }
      })
    })

    test('should map falsey values to undefined', async () => {
      const res = await maybeParseCursor('from')({
        foo: 'bar',
        from: ''
      }).toPromise()

      assert.deepStrictEqual(res, {
        foo: 'bar',
        from: undefined
      })
    })
  })

  describe('busyIn', () => {
    test('return the promise', async () => {
      const res = await busyIn(500, Promise.resolve(true), () => Promise.resolve(false))
      assert.ok(res)
    })

    test('return the busyFn result', async () => {
      const res = await busyIn(250, new Promise(resolve => setTimeout(() => resolve(true), 500)), () => Promise.resolve(false))
      assert.equal(res, false)
    })

    test('return the promise if time is set to 0', async () => {
      const res = await busyIn(0, new Promise(resolve => setTimeout(() => resolve(true), 100)), () => Promise.resolve(false))
      assert.ok(res)
    })
  })

  describe('findPendingForProcessBefore', () => {
    const pendingMap = new Map()
    const processId = 'process-123'
    const now = new Date()
    const thirtyMinAgo = ms('30m')
    const fifteenMinAgo = ms('15m')
    pendingMap.set(`${processId},${now.getTime() - thirtyMinAgo},,,true`, { pending: Promise.resolve(thirtyMinAgo) })
    // latest
    pendingMap.set(`${processId},${now.getTime() - fifteenMinAgo},,,true`, { pending: Promise.resolve(fifteenMinAgo) })
    // Diff process
    pendingMap.set(`process-456,${now.getTime() - fifteenMinAgo},,,true`, { pending: Promise.resolve(10) })

    const findPendingForProcessBefore = findPendingForProcessBeforeWith(pendingMap)

    test('should return undefined if no timestamp', () => {
      assert.equal(findPendingForProcessBefore({ processId }), undefined)
      assert.equal(findPendingForProcessBefore({ processId, timestamp: '' }), undefined)
    })

    test('should return undefined if no entry found before timestamp', () => {
      assert.equal(findPendingForProcessBefore({ processId, timestamp: now - ms('40m') }), undefined)
    })

    test('should return the latest entry before the timestamp for the process', async () => {
      const [key, value] = findPendingForProcessBefore({ processId, timestamp: now.getTime() })
      assert.equal(key, `${processId},${now.getTime() - fifteenMinAgo},,,true`)
      assert.equal(await value.pending, fifteenMinAgo)

      const [key2, value2] = findPendingForProcessBefore({ processId, timestamp: now.getTime() - fifteenMinAgo })
      assert.equal(key2, `${processId},${now.getTime() - thirtyMinAgo},,,true`)
      assert.equal(await value2.pending, thirtyMinAgo)
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
          delay: 0,
          log: () => '',
          name: ''
        })
      ))

      assert.ok(isPromise(
        backoff(() => '', {
          maxRetries: 0,
          delay: 0,
          log: () => '',
          name: ''
        })
      ))
    })

    test('should not retry calling the function', async () => {
      let count = 0
      const fn = () => count++
      await backoff(fn, {
        maxRetries: 0,
        delay: 0,
        log: () => '',
        name: ''
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
        delay: 0,
        log: () => '',
        name: ''
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
        delay: 0,
        log: () => '',
        name: ''
      }).catch(err => {
        assert.equal(err, 'bar')
        assert.equal(count, 3)
      })
    })
  })
})
