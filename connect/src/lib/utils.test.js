import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { z } from 'zod'

import { errFrom, joinUrl, removeTagsByNameMaybeValue } from './utils.js'

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
})
