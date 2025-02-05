/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { createHash } from 'node:crypto'

import { loadMessageMetaSchema, loadProcessSchema, loadTimestampSchema } from '../domain/dal.js'
import { messageSchema } from '../domain/model.js'
import { createTestLogger } from '../domain/logger.js'
import { isHashChainValidWith, loadMessageMetaWith, loadProcessWith, loadTimestampWith, mapNode } from './ao-su.js'
import { hashChain } from './worker/hashChain/main.js'

const withoutAoGlobal = messageSchema.omit({ AoGlobal: true })
const logger = createTestLogger({ name: 'ao-cu:ao-su' })

describe('ao-su', () => {
  describe('mapNode', () => {
    const now = new Date().getTime()
    const messageId = 'message-123'
    const assignmentId = 'assignment-123'
    const assignedMessageId = 'assigned-123'
    const expected = {
      cron: undefined,
      ordinate: '23',
      name: `Scheduled Message ${messageId} ${now}:23`,
      exclude: undefined,
      assignmentId,
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

    test('should map a scheduled message', () => {
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
          id: assignmentId,
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
      assert.equal(res.assignmentId, assignmentId)
    })

    describe('should map an assignment tx', () => {
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

      test('should set isAssignment to true', () => {
        assert.ok(res.isAssignment)
      })

      test('should set message.Id to the assignment Message tag', () => {
        assert.equal(res.message.Id, assignedMessageId)
        assert.equal(res.message.Message, assignedMessageId)
      })

      test('should explicitly set message.Target to undefined', () => {
        assert.equal(res.message.Target, undefined)
      })

      test('should set the name to indicate an assignment', () => {
        assert.equal(res.name, `Assigned Message ${assignedMessageId} ${now}:23`)
      })

      test('should set all other message fields as normal', () => {
        assert.deepStrictEqual(res.message, {
          Id: assignedMessageId,
          Message: assignedMessageId,
          Target: undefined,
          Epoch: 0,
          Nonce: 23,
          Timestamp: now,
          'Block-Height': 123,
          'Hash-Chain': 'hash-123',
          Cron: false
        })
      })
    })
  })

  describe('isHashChainValid', () => {
    const isHashChainValid = isHashChainValidWith({ hashChain })
    const now = new Date().getTime()
    const messageId = 'message-123'
    const scheduled = {
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

    test('should return whether the hashChain exists if there is no previous assignment', async () => {
      // no prev info
      assert(await isHashChainValid({}, scheduled))
      // first assignment ergo has no prev assignment
      assert(await isHashChainValid({
        hashChain: null,
        assignmentId: 'foo'
      }, scheduled))
      assert(await isHashChainValid({
        hashChain: 'foo',
        assignmentId: null
      }, scheduled))
    })

    test('should calculate and compare the hashChain based on the previous assignment', async () => {
      const prevAssignmentId = Buffer.from('assignment-123', 'utf8').toString('base64url')
      const prevHashChain = Buffer.from('hashchain-123', 'utf8').toString('base64url')

      const prev = { assignmentId: prevAssignmentId, hashChain: prevHashChain }

      const expected = createHash('sha256')
        .update(Buffer.from(prevAssignmentId, 'base64url'))
        .update(Buffer.from(prevHashChain, 'base64url'))
        .digest('base64url')

      const valid = {
        message: {
          // ....
          'Hash-Chain': expected
        }
      }

      assert(await isHashChainValid(prev, valid))

      const invalid = {
        message: {
          'Hash-Chain': createHash('sha256')
            .update(Buffer.from('something else', 'base64url'))
            .update(Buffer.from(prevHashChain, 'base64url'))
            .digest('base64url')
        }
      }

      assert(!(await isHashChainValid(prev, invalid)))
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
          },
          logger
        })
      )

      const res = await loadMessageMeta({
        suUrl: 'https://foo.bar',
        processId: 'process-123',
        messageUid: 'message-tx-123'
      })

      assert.deepStrictEqual(res, {
        processId: 'process-123',
        timestamp: 12345,
        nonce: 3
      })
    })

    test('retry if error received from SU', async () => {
      let count = 0
      const loadMessageMeta = loadMessageMetaSchema.implement(
        loadMessageMetaWith({
          fetch: async (url, options) => {
            if (!count) {
              count++
              throw new Error('woops')
            }

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
          },
          logger
        })
      )

      const res = await loadMessageMeta({
        suUrl: 'https://foo.bar',
        processId: 'process-123',
        messageUid: 'message-tx-123'
      })

      assert.ok(!!count)

      assert.deepStrictEqual(res, {
        processId: 'process-123',
        timestamp: 12345,
        nonce: 3
      })
    })

    test('retry if not OK res received from SU', async () => {
      let count = 0
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
            }), { status: !(count++) ? 408 : 200 })
          },
          logger
        })
      )

      const res = await loadMessageMeta({
        suUrl: 'https://foo.bar',
        processId: 'process-123',
        messageUid: 'message-tx-123'
      })

      assert.ok(!!count)

      assert.deepStrictEqual(res, {
        processId: 'process-123',
        timestamp: 12345,
        nonce: 3
      })
    })
  })

  describe('loadProcessesWith', () => {
    test('load the process metadata', async () => {
      const loadProcess = loadProcessSchema.implement(loadProcessWith({
        fetch: async () => {
          return {
            ok: true,
            json: () => {
              return {
                process_id: 'pid-2',
                block: '000000001',
                owner: {
                  address: 'owner-address-1',
                  key: 'owner-key-1'
                },
                tags: [
                  { name: 'Foo', value: 'Bar' }
                ],
                timestamp: 123456,
                data: '1984',
                anchor: null,
                signature: 'signature-1'
              }
            }
          }
        },
        logger
      }))
      const result = await loadProcess({
        suUrl: 'https://foo.bar',
        processId: 'pid-1'
      })
      assert.deepStrictEqual(result, {
        owner: {
          address: 'owner-address-1',
          key: 'owner-key-1'
        },
        tags: [
          { name: 'Foo', value: 'Bar' }
        ],
        block: {
          height: 1,
          timestamp: 123456
        },
        processId: 'pid-1',
        timestamp: 123456,
        signature: 'signature-1',
        data: '1984',
        nonce: 0,
        anchor: null
      })
    })
  })

  describe('loadTimestampWith', () => {
    test('load process timestamp and block height', async () => {
      const loadTimestamp = loadTimestampSchema.implement(loadTimestampWith({
        fetch: async () => {
          return {
            ok: true,
            json: () => {
              return {
                block_height: '0000001',
                timestamp: '123456'
              }
            }
          }
        },
        logger
      }))

      const result = await loadTimestamp({
        suUrl: 'https://foo.bar',
        processId: 'pid-1'
      })

      assert.deepStrictEqual(result, {
        timestamp: 123456,
        height: 1
      })
    })
  })
})
