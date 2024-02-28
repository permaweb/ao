import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { z } from 'zod'

import { busyIn, errFrom, evaluationToCursor, findPendingForProcessBeforeWith, maybeParseCursor } from './utils.js'
import ms from 'ms'

describe('utils', () => {
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
})
