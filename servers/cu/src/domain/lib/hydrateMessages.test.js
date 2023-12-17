/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { bytesToBase64, maybeAoLoadWith, maybeMessageIdWith } from './hydrateMessages.js'

const logger = createLogger('ao-cu:readState')

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
        'Forwarded-For': 'process-123',
        Tags: [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'ao-type', value: 'message' },
          { name: 'function', value: 'notify' },
          { name: 'Forwarded-For', value: 'process-123' }
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

  describe('maybeAoLoadWith', () => {
    test('should build the ao-load message', async () => {
      const notAoLoad = {
        message: {
          Id: 'message-tx-345',
          Signature: 'sig-345',
          Owner: 'owner-345',
          Tags: [
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Type', value: 'Message' },
            { name: 'function', value: 'notify' }
          ],
          Data: 'foobar'
        }
      }
      const cronMessage = {
        message: {
          Id: 'message-tx-345',
          Signature: 'sig-345',
          Owner: 'owner-345',
          Tags: [
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Type', value: 'Message' },
            { name: 'function', value: 'notify' }
          ],
          Data: 'foobar',
          Cron: true
        }
      }
      const aoLoad = {
        message: {
          Id: 'message-tx-456',
          Signature: 'sig-456',
          Owner: 'owner-456',
          Tags: [
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Type', value: 'Message' },
            { name: 'function', value: 'notify' },
            { name: 'Load', value: 'message-tx-123' }
          ],
          Data: 'overwritten'
        }
      }

      async function * messageStream () {
        yield notAoLoad
        yield aoLoad
        yield cronMessage
      }

      const maybeAoLoad = maybeAoLoadWith({
        loadTransactionData: async (id) => {
          assert.equal(id, 'message-tx-123')
          return new Response('Hello World 🤖❌⚡️')
        },
        loadTransactionMeta: async (id) => {
          assert.equal(id, 'message-tx-123')
          return {
            id: 'message-tx-123',
            signature: 'sig-123',
            anchor: 'anchor-123',
            owner: {
              address: 'owner-123'
            },
            tags: [
              { name: 'foo', value: 'bar' }
            ]
          }
        },
        logger
      })

      const hydrated = maybeAoLoad(messageStream())

      const messages = []
      for await (const message of hydrated) messages.push(message)

      assert.equal(messages.length, 3)
      const [one, two, three] = messages
      assert.deepStrictEqual(one, notAoLoad)
      assert.deepStrictEqual(three, cronMessage)

      assert.deepStrictEqual(two, {
        ...aoLoad,
        message: {
          ...aoLoad.message,
          // original data overwritten with constructed data item
          Data: {
            Id: 'message-tx-123',
            Signature: 'sig-123',
            Owner: 'owner-123',
            Tags: [
              { name: 'foo', value: 'bar' }
            ],
            Anchor: 'anchor-123',
            Data: bytesToBase64(await new Response('Hello World 🤖❌⚡️').arrayBuffer())
          }
        }
      })
    })
  })
})
