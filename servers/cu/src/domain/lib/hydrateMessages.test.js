/* eslint-disable no-throw-literal */
import { describe, test, before } from 'node:test'
import assert from 'node:assert'

import { createTestLogger } from '../logger.js'
import { bytesToBase64, maybeAoAssignmentWith, maybeMessageIdWith } from './hydrateMessages.js'

const logger = createTestLogger({ name: 'ao-cu:readState' })

describe('hydrateMessages', () => {
  describe('bytesToBase64', () => {
    function base64ToBytes (base64) {
      const binString = atob(base64)
      return Uint8Array.from(binString, (m) => m.codePointAt(0))
    }

    test('should convert the bytes to base64', async () => {
      const arrBuffer = await new Response('Hello World').arrayBuffer()
      const res = bytesToBase64(arrBuffer)
      assert(res)
      assert.equal(
        new TextDecoder().decode(base64ToBytes(res)),
        'Hello World'
      )
    })

    test('should handle unicode', async () => {
      const arrBuffer = await new Response('Hello World 🤖❌⚡️').arrayBuffer()
      const res = bytesToBase64(arrBuffer)
      assert(res)
      assert.equal(
        new TextDecoder().decode(base64ToBytes(res)),
        'Hello World 🤖❌⚡️'
      )
    })
  })

  describe('maybeMessageIdWith', () => {
    const notForwarded = {
      message: {
        Id: 'message-tx-345',
        Signature: 'sig-123',
        Tags: [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'ao-type', value: 'message' },
          { name: 'function', value: 'notify' }
        ],
        Data: 'foobar'
      }
    }

    const forwarded = {
      message: {
        Id: 'message-tx-456',
        Signature: 'sig-123',
        'Forwarded-By': 'process-123',
        Tags: [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'ao-type', value: 'message' },
          { name: 'function', value: 'notify' },
          { name: 'Forwarded-By', value: 'process-123' }
        ],
        Data: 'foobar'
      }
    }

    test('should conditionally calculate the deephash and attach to the message', async () => {
      const maybeMessageId = maybeMessageIdWith({ logger })

      async function * messageStream () {
        yield forwarded
        yield notForwarded
        yield forwarded
      }

      const hydrated = maybeMessageId(messageStream())

      const messages = []
      for await (const message of hydrated) messages.push(message)

      assert.equal(messages.length, 3)
      const [one, two, three] = messages
      assert.ok(one.deepHash)
      assert.ok(!two.deepHash)
      assert.ok(three.deepHash)
      /**
       * Should be pure, this is CRUCIAL, so that the same shape
       * will produce the same hash, every time
       */
      assert.equal(one.deepHash, three.deepHash)
    })
  })

  describe('maybeAoAssignmentWith', () => {
    const notAssignment = {
      message: {
        Id: 'message-tx-345',
        Signature: 'sig-345',
        Owner: 'owner-345',
        Target: 'process-123',
        Tags: [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Message' },
          { name: 'function', value: 'notify' }
        ],
        Data: 'foobar'
      }
    }
    const aoAssignment = {
      ordinate: 13,
      isAssignment: true,
      message: {
        Id: 'message-tx-123',
        Epoch: 0,
        Nonce: 23,
        'Block-Height': 123,
        Timestamp: 123,
        Target: 'process-123'
      },
      block: { height: 99 }
    }

    const aoAssignmentWithExclude = {
      ordinate: 13,
      isAssignment: true,
      exclude: ['Tags', 'Anchor', 'Signature'],
      message: {
        Id: 'message-tx-789',
        Epoch: 0,
        Nonce: 23,
        'Block-Height': 789,
        Timestamp: 789,
        Target: 'process-123'
      },
      block: { height: 99 }
    }

    const aoAssignmentWithExcludeData = {
      ordinate: 13,
      isAssignment: true,
      exclude: ['Tags', 'Data'],
      message: {
        Id: 'message-tx-989',
        Epoch: 0,
        Nonce: 23,
        'Block-Height': 989,
        Timestamp: 989,
        Target: 'process-123'
      },
      block: { height: 99 }
    }

    async function * messageStream () {
      yield notAssignment
      yield aoAssignment
      yield notAssignment
      yield aoAssignmentWithExclude
      yield aoAssignmentWithExcludeData
    }

    const deps = {
      loadTransactionData: async (id) => {
        if (id === aoAssignment.message.Id) return new Response('Hello World 🤖❌⚡️')
        if (id === aoAssignmentWithExclude.message.Id) return new Response('Yay Data')
        assert.fail(`should not call loadTransactionData for id ${id}`)
      },
      loadTransactionMeta: async (id, options) => {
        if (id === aoAssignment.message.Id) {
          return {
            id,
            signature: 'sig-123',
            anchor: 'anchor-123',
            owner: {
              address: 'owner-123',
              key: 'key-123'
            },
            tags: [
              { name: 'foo', value: 'bar' }
            ],
            recipient: 'recipient-123'
          }
        }

        if (id === aoAssignmentWithExclude.message.Id) {
          assert.deepStrictEqual(options, {
            skipTags: true,
            skipAnchor: true,
            skipSignature: true
          })

          return {
            id,
            owner: {
              address: 'owner-123',
              key: 'key-123'
            },
            // recipient could be an empty string
            recipient: ''
          }
        }

        if (id === aoAssignmentWithExcludeData.message.Id) {
          assert.ok(options.skipTags)
          assert.ok(!options.skipAnchor)
          assert.ok(!options.skipSignature)

          return {
            id,
            signature: 'sig-123',
            anchor: 'anchor-123',
            owner: {
              address: 'owner-123',
              key: 'key-123'
            },
            // Not possible with graphql client impl, but still need to test '' default
            recipient: undefined
          }
        }

        assert.fail(`should not call loadTransactionMeta for id ${id}`)
      }
    }

    const maybeAoAssignment = maybeAoAssignmentWith(deps)

    const hydrated = maybeAoAssignment(messageStream())
    const messages = []
    before(async () => {
      for await (const message of hydrated) messages.push(message)
    })

    test('should emit the messages in same order', () => {
      const [one, two, three] = messages
      assert.deepStrictEqual(one, notAssignment)
      assert.equal(two.ordinate, aoAssignment.ordinate)
      assert.deepStrictEqual(three, notAssignment)
    })

    test('should hydrate the message from on chain', async () => {
      const [, two] = messages
      assert.deepStrictEqual(two, {
        ...aoAssignment,
        message: {
          ...aoAssignment.message,
          // original fields overwritten with constructed data item
          Signature: 'sig-123',
          Anchor: 'anchor-123',
          Tags: [
            { name: 'foo', value: 'bar' }
          ],
          Owner: 'owner-123',
          From: 'owner-123',
          Target: 'recipient-123',
          Data: 'Hello World 🤖❌⚡️'
        }
      })

      assert.equal(two.message.Target, 'recipient-123')
    })

    test('should not load meta fields if excluded', () => {
      const [,,, four] = messages

      assert.deepStrictEqual(four, {
        ...aoAssignmentWithExclude,
        message: {
          ...aoAssignmentWithExclude.message,
          Signature: undefined,
          Anchor: undefined,
          Tags: [],
          Owner: 'owner-123',
          From: 'owner-123',
          Target: '',
          Data: 'Yay Data'
        }
      })

      assert.equal(four.message.Target, '')
    })

    test('should not load Data if excluded', () => {
      const [,,,, five] = messages

      assert.deepStrictEqual(five, {
        ...aoAssignmentWithExcludeData,
        message: {
          ...aoAssignmentWithExcludeData.message,
          Signature: 'sig-123',
          Anchor: 'anchor-123',
          // Tags excluded
          Tags: [],
          Owner: 'owner-123',
          From: 'owner-123',
          Target: '',
          // Data omitted
          Data: undefined
        }
      })

      assert.equal(five.message.Target, '')
    })
  })
})
