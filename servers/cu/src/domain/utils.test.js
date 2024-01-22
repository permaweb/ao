import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { z } from 'zod'

import { errFrom, evaluationToCursor, maybeParseCursor } from './utils.js'

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
})
