import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { z } from 'zod'

import { errFrom, joinUrl, preprocessUrls, removeTagsByNameMaybeValue, swallow } from './utils.js'

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

    test('should use the provided values', () => {
      const config = preprocessUrls({ GATEWAY_URL, ARWEAVE_URL, GRAPHQL_URL })
      assert.equal(config.ARWEAVE_URL, ARWEAVE_URL)
      assert.equal(config.GRAPHQL_URL, GRAPHQL_URL)
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

  describe('swallow', () => {
    test('should resolve the original promise', async () => {
      const safeFunction = swallow(() => Promise.resolve('hello world'))
      const result = await safeFunction()

      assert.strictEqual(result, 'hello world')
    })

    test('should resolve undefined for a rejected promise', async () => {
      const safeFunction = swallow(() => Promise.reject(new Error('This error should be swallowed')))
      const result = await safeFunction()

      assert.strictEqual(result, undefined)
    })

    test('should return the result of the function', () => {
      const safeFunction = swallow(() => 'hello world')
      const result = safeFunction()

      assert.equal(result, 'hello world')
    })

    test('should return undefined for a thrown error', () => {
      const safeFunction = swallow(() => { throw new Error('This error should be swallowed') })
      const result = safeFunction()

      assert.strictEqual(result, undefined)
    })
  })
})
