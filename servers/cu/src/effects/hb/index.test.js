/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { createHash } from 'node:crypto'

import { loadMessageMetaSchema, loadProcessSchema, loadTimestampSchema } from '../../domain/dal.js'
import { messageSchema } from '../../domain/model.js'
import { createTestLogger } from '../../domain/logger.js'
import { isHashChainValidWith, loadMessageMetaWith, loadProcessWith, loadTimestampWith, mapNode } from './index.js'
import { hashChain } from '.././worker/hashChain/main.js'

const withoutAoGlobal = messageSchema.omit({ AoGlobal: true })
const logger = createTestLogger({ name: 'ao-cu:ao-su' })

describe('hb-su', () => {
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
        Tags: [{ name: 'Inner', value: 'test' }],
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
          Id: messageId,
          Owner: 'owner-123',
          Tags: [
            { name: 'Inner', value: 'test' }
          ],
          Signature: 'sig-123',
          Anchor: '00000000123',
          Data: 'data-123'
        },
        assignment: {
          Id: assignmentId,
          Anchor: '',
          Owner: 'su-123',
          Tags: [
            { name: 'Block-Height', value: 123 },
            { name: 'Block-Timestamp', value: now - 10000 },
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Epoch', value: '0' },
            { name: 'Hash-Chain', value: 'hash-123' },
            { name: 'Path', value: 'compute' },
            { name: 'Process', value: 'process-123' },
            { name: 'Slot', value: 23 },
            { name: 'Timestamp', value: now },
            { name: 'Variant', value: 'ao.N.1' }
          ],
          Data: 'su-data-123'
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
        message: {
          Id: assignedMessageId
        },
        assignment: {
          Owner: 'su-123',
          Tags: [
            { name: 'Block-Height', value: 123 },
            { name: 'Block-Timestamp', value: now - 10000 },
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Epoch', value: '0' },
            { name: 'Hash-Chain', value: 'hash-123' },
            { name: 'Path', value: 'compute' },
            { name: 'Process', value: 'process-123' },
            { name: 'Slot', value: 23 },
            { name: 'Timestamp', value: now },
            { name: 'Variant', value: 'ao.N.1' }
          ],
          Data: 'su-data-123'
        }
      })

      test('should set isAssignment to true', () => {
        assert.ok(res.isAssignment)
      })

      test('should set message.Id to the assignment Message tag', () => {
        assert.equal(res.message.Id, assignedMessageId)
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
          fetch: async (url) => {
            url = new URL(url)
            const params = Object.fromEntries(url.searchParams)

            assert.equal(url.origin, 'https://foo.bar')
            assert.equal(url.pathname, '/~scheduler@1.0/schedule')
            assert.deepStrictEqual(params, {
              target: 'process-123',
              'from+Integer': '3',
              'to+Integer': '3',
              limit: '1',
              accept: 'application/aos-2'
            })

            return new Response(JSON.stringify({
              page_info: { has_next_page: false },
              edges: [{
                cursor: '3',
                node: {
                  message: {
                    Id: 'message-123',
                    Owner: 'owner-123',
                    Tags: [
                      { name: 'Inner', value: 'test' }
                    ],
                    Signature: 'sig-123',
                    Anchor: '00000000123',
                    Data: 'data-123'
                  },
                  assignment: {
                    Id: 'assignment-123',
                    Anchor: '',
                    Owner: 'su-123',
                    Tags: [
                      { name: 'Block-Height', value: 123 },
                      { name: 'Block-Timestamp', value: new Date().getTime() },
                      { name: 'Data-Protocol', value: 'ao' },
                      { name: 'Epoch', value: '0' },
                      { name: 'Hash-Chain', value: 'hash-123' },
                      { name: 'Path', value: 'compute' },
                      { name: 'Process', value: 'process-123' },
                      { name: 'Slot', value: '3' },
                      { name: 'Timestamp', value: 12345 },
                      { name: 'Variant', value: 'ao.N.1' }
                    ],
                    Data: 'su-data-123'
                  }
                }
              }]
            }))
          },
          logger
        })
      )

      const res = await loadMessageMeta({
        suUrl: 'https://foo.bar',
        processId: 'process-123',
        messageUid: '3'
      })

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
        fetch: async (url) => {
          url = new URL(url)
          const params = Object.fromEntries(url.searchParams)

          assert.equal(url.origin, 'https://foo.bar')
          assert.equal(url.pathname, '/~scheduler@1.0/schedule')
          assert.deepStrictEqual(params, {
            target: 'pid-1',
            'from+Integer': '0',
            'to+Integer': '0',
            limit: '1',
            accept: 'application/aos-2'
          })

          return new Response(JSON.stringify({
            page_info: { has_next_page: false },
            edges: [{
              cursor: '0',
              node: {
                message: {
                  Id: 'message-123',
                  Owner: 'owner-123',
                  Tags: [
                    { name: 'Foo', value: 'Bar' }
                  ],
                  Signature: 'signature-1',
                  Anchor: null,
                  Data: '1984'
                },
                assignment: {
                  Id: 'assignment-123',
                  Anchor: '',
                  Owner: 'su-123',
                  Tags: [
                    { name: 'Block-Height', value: 123 },
                    { name: 'Block-Timestamp', value: new Date().getTime() },
                    { name: 'Data-Protocol', value: 'ao' },
                    { name: 'Epoch', value: '0' },
                    { name: 'Hash-Chain', value: 'hash-123' },
                    { name: 'Path', value: 'compute' },
                    { name: 'Process', value: 'process-123' },
                    { name: 'Slot', value: 0 },
                    { name: 'Timestamp', value: 123456 },
                    { name: 'Variant', value: 'ao.N.1' }
                  ],
                  Data: 'su-data-123'
                }
              }
            }]
          }))
        },
        logger
      }))
      const result = await loadProcess({
        suUrl: 'https://foo.bar',
        processId: 'pid-1'
      })
      assert.deepStrictEqual(result, {
        owner: {
          address: 'owner-123',
          key: undefined
        },
        tags: [
          { name: 'Foo', value: 'Bar' }
        ],
        block: {
          height: 123,
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
        fetch: async (url) => {
          url = new URL(url)
          const params = Object.fromEntries(url.searchParams)

          assert.equal(url.origin, 'https://foo.bar')
          assert.equal(url.pathname, '/~scheduler@1.0/schedule')
          assert.deepStrictEqual(params, {
            target: 'pid-1',
            'from+Integer': '0',
            'to+Integer': '0',
            limit: '1',
            accept: 'application/aos-2'
          })

          return new Response(JSON.stringify({
            page_info: {
              has_next_page: false,
              timestamp: 123456,
              'block-height': '1'
            },
            edges: []
          }))
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
