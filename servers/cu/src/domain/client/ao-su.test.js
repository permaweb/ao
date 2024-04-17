/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { loadMessageMetaSchema } from '../dal.js'
import { loadMessageMetaWith, mapNode } from './ao-su.js'
import { messageSchema } from '../model.js'

const withoutAoGlobal = messageSchema.omit({ AoGlobal: true })

describe('ao-su', () => {
  describe('mapNode', () => {
    const now = new Date().getTime()
    const messageId = 'message-123'
    const assignedMessageId = 'assigned-123'
    const expected = {
      cron: undefined,
      ordinate: '23',
      name: `Scheduled Message ${messageId} ${now}:23`,
      exclude: undefined,
      message: {
        Id: messageId,
        Signature: 'sig-123',
        Data: 'data-123',
        Owner: 'owner-123',
        Target: 'process-123',
        Anchor: '00000000123',
        From: 'owner-123',
        'Forwarded-By': undefined,
        Tags: [{ name: 'Foo', value: 'Bar' }],
        Epoch: 0,
        Nonce: 23,
        Timestamp: now,
        'Block-Height': 123,
        'Hash-Chain': 'hash-123',
        Cron: false
      },
      block: {
        height: 123,
        timestamp: now
      }
    }

    test('should map the current shape', () => {
      const res = mapNode({
        message: {
          id: messageId,
          tags: [{ name: 'Foo', value: 'Bar' }],
          signature: 'sig-123',
          anchor: '00000000123',
          owner: {
            address: 'owner-123',
            key: 'key-123'
          },
          data: 'data-123'
        },
        assignment: {
          owner: {
            address: 'su-123',
            key: 'su-123'
          },
          tags: [
            { name: 'Epoch', value: '0' },
            { name: 'Nonce', value: '23' },
            { name: 'Process', value: 'process-123' },
            { name: 'Block-Height', value: '000000000123' },
            { name: 'Timestamp', value: `${now}` },
            { name: 'Hash-Chain', value: 'hash-123' }
          ],
          data: 'su-data-123'
        }
      })
      assert.deepStrictEqual(
        withoutAoGlobal.parse(res),
        withoutAoGlobal.parse(expected)
      )
      assert.equal(res.isAssignment, false)
    })

    test('should set isAssignment to true message.Id to assignment Message tag if an assignment of message on-chain', () => {
      const res = mapNode({
        message: null,
        assignment: {
          owner: {
            address: 'su-123',
            key: 'su-123'
          },
          tags: [
            { name: 'Epoch', value: '0' },
            { name: 'Nonce', value: '23' },
            { name: 'Process', value: 'process-123' },
            { name: 'Block-Height', value: '000000000123' },
            { name: 'Timestamp', value: `${now}` },
            { name: 'Hash-Chain', value: 'hash-123' },
            { name: 'Message', value: assignedMessageId }
          ],
          data: 'su-data-123'
        }
      })
      assert.deepStrictEqual(res.message, {
        Id: assignedMessageId,
        Message: assignedMessageId,
        Target: 'process-123',
        Epoch: 0,
        Nonce: 23,
        Timestamp: now,
        'Block-Height': 123,
        'Hash-Chain': 'hash-123',
        Cron: false
      })
      assert.ok(res.isAssignment)
    })
  })

  describe('loadMessageMetaWith', () => {
    test('return the message meta', async () => {
      const loadMessageMeta = loadMessageMetaSchema.implement(
        loadMessageMetaWith({
          fetch: async (url, options) => {
            assert.equal(url, 'https://foo.bar/message-tx-123?process-id=process-123')
            assert.deepStrictEqual(options, { method: 'GET' })

            return new Response(JSON.stringify({
              message: {}, // not used, but will be present
              assignment: {
                tags: [
                  { name: 'Process', value: 'process-123' },
                  { name: 'Nonce', value: '3' },
                  { name: 'Timestamp', value: '12345' }
                ]
              }
            }))
          }
        })
      )

      const res = await loadMessageMeta({
        suUrl: 'https://foo.bar',
        processId: 'process-123',
        messageTxId: 'message-tx-123'
      })

      assert.deepStrictEqual(res, {
        processId: 'process-123',
        timestamp: 12345,
        nonce: 3
      })
    })
  })
})
