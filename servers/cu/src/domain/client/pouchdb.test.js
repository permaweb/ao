/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { deflate } from 'node:zlib'
import { promisify } from 'node:util'

import { findEvaluationsSchema, findLatestEvaluationSchema, findMessageHashSchema, saveEvaluationSchema } from '../dal.js'
import {
  CRON_EVALS_ASC_IDX,
  EVALS_ASC_IDX,
  findEvaluationsWith,
  findLatestEvaluationWith,
  findMessageHashWith,
  saveEvaluationWith
} from './pouchdb.js'
import { createLogger } from '../logger.js'

const logger = createLogger('ao-cu:readState')
const deflateP = promisify(deflate)

describe('pouchdb', () => {
  describe('findLatestEvaluation', () => {
    test('return the lastest evaluation for the process', async () => {
      const evaluatedAt = new Date().toISOString()
      const Memory = Buffer.from('Hello World', 'utf-8')

      const findLatestEvaluation = findLatestEvaluationSchema.implement(
        findLatestEvaluationWith({
          pouchDb: {
            find: async (op) => {
              return {
                docs: [
                  {
                    _id: 'eval-process-123,1702677252111',
                    timestamp: 1702677252111,
                    ordinate: 1,
                    blockHeight: 1234,
                    processId: 'process-123',
                    messageId: 'message-123',
                    parent: 'proc-process-123',
                    output: { Messages: [{ foo: 'bar' }] },
                    evaluatedAt,
                    type: 'evaluation'
                  }
                ]
              }
            },
            getAttachment: async (_id, name) => {
              assert.equal(_id, 'eval-process-123,1702677252111')
              assert.equal(name, 'memory.txt')
              // impl will inflate this buffer
              return deflateP(Memory)
            }
          },
          logger
        }))

      const res = await findLatestEvaluation({
        processId: 'process-123',
        to: 1702677252111,
        ordinate: '1',
        cron: '1-10-minutes'
      })

      assert.equal(res.timestamp, 1702677252111)
      assert.equal(res.ordinate, '1')
      assert.equal(res.blockHeight, 1234)
      assert.equal(res.processId, 'process-123')
      assert.deepStrictEqual(res.output, { Memory, Messages: [{ foo: 'bar' }] })
      assert.equal(res.evaluatedAt.toISOString(), evaluatedAt)
    })

    test('rejects if no interaction is found', async () => {
      const findLatestEvaluation = findLatestEvaluationSchema.implement(
        findLatestEvaluationWith({
          pouchDb: {
            find: async () => ({ docs: [] })
          },
          logger
        })
      )
      await findLatestEvaluation({
        processId: 'process-123',
        to: '1702677252111'
      })
        .then(assert.fail)
        .catch(() => assert.ok(true))
    })
  })

  describe('saveEvaluation', () => {
    test('save the evaluation to pouchdb with the Memory as an attachment, and the messageHash', async () => {
      const evaluatedAt = new Date().toISOString()
      const Memory = Buffer.from('Hello World', 'utf-8')

      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          pouchDb: {
            bulkDocs: async ([evaluationDoc, messageIdDoc]) => {
              const { _attachments, evaluatedAt, ...rest } = evaluationDoc

              assert.deepStrictEqual(rest, {
                _id: 'eval-process-123,1702677252111,1',
                cron: undefined,
                timestamp: 1702677252111,
                ordinate: '1',
                blockHeight: 1234,
                processId: 'process-123',
                messageId: 'message-123',
                parent: 'proc-process-123',
                // buffer is omitted from output and moved to _attachments
                output: { Messages: [{ foo: 'bar' }] },
                type: 'evaluation'
              })
              assert.deepStrictEqual(evaluationDoc._attachments, {
                'memory.txt': {
                  content_type: 'text/plain',
                  /**
                   * zlib compress the buffer before persisting
                   *
                   * In testing, this results in orders of magnitude
                   * smaller buffer and smaller persistence times
                   */
                  data: await deflateP(Memory)
                }
              })
              assert.equal(evaluatedAt.toISOString(), evaluatedAt.toISOString())

              assert.deepStrictEqual(messageIdDoc, {
                _id: 'messageHash-deepHash-123',
                parent: 'eval-process-123,1702677252111,1',
                type: 'messageHash'
              })
              return Promise.resolve(true)
            }
          },
          logger
        })
      )

      await saveEvaluation({
        deepHash: 'deepHash-123',
        timestamp: 1702677252111,
        ordinate: 1,
        blockHeight: 1234,
        processId: 'process-123',
        messageId: 'message-123',
        output: { Memory, Messages: [{ foo: 'bar' }] },
        evaluatedAt
      })
    })

    test('save only the evaluation as a doc, if not deepHash', async () => {
      const evaluatedAt = new Date().toISOString()
      const Memmory = Buffer.from('Hello World', 'utf-8')

      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          pouchDb: {
            bulkDocs: async (docs) => {
              assert.equal(docs.length, 1)
              return Promise.resolve(true)
            }
          },
          logger
        })
      )

      await saveEvaluation({
        // no deep hash
        timestamp: 1702677252111,
        ordinate: 1,
        blockHeight: 1234,
        processId: 'process-123',
        messageId: 'message-123',
        output: { Memmory, Messages: [{ foo: 'bar' }] },
        evaluatedAt
      })
    })
  })

  describe('findEvaluations', () => {
    test('return the list of all cron evaluations', async () => {
      const evaluatedAt = new Date().toISOString()
      const mockEval = {
        _id: 'eval-process-123,1702677252111',
        timestamp: 1702677252111,
        ordinate: 1,
        blockHeight: 1234,
        processId: 'process-123',
        messageId: 'message-123',
        parent: 'proc-process-123',
        output: { },
        evaluatedAt,
        type: 'evaluation'
      }
      const findEvaluations = findEvaluationsSchema.implement(
        findEvaluationsWith({
          pouchDb: {
            find: async (op) => {
              assert.deepStrictEqual(op.selector.cron, { $exists: true })
              assert.equal(op.use_index, CRON_EVALS_ASC_IDX)

              assert.equal(op.limit, 10)
              assert.deepStrictEqual(op.sort, [{ _id: 'asc' }])

              return {
                docs: [
                  mockEval,
                  mockEval
                ]
              }
            }
          },
          logger
        }))

      const res = await findEvaluations({ processId: 'process-123', limit: 10, sort: 'ASC', onlyCron: true })

      assert.equal(res.length, 2)
    })

    test("return the evaluations between 'from' and 'to'", async () => {
      const evaluatedAt = new Date().toISOString()
      const mockEval = {
        _id: 'eval-process-123,1702677252111',
        timestamp: 1702677252111,
        ordinate: 1,
        blockHeight: 1234,
        processId: 'process-123',
        messageId: 'message-123',
        parent: 'process-123',
        output: { state: { foo: 'bar' } },
        evaluatedAt,
        type: 'evaluation'
      }
      const findEvaluations = findEvaluationsSchema.implement(
        findEvaluationsWith({
          pouchDb: {
            find: async (op) => {
              assert.deepStrictEqual(op.selector, {
                _id: {
                  $gt: 'eval-process-123,1702677252111,3',
                  $lte: 'eval-process-123,1702677252111'
                }
              })

              /**
               * no onlyCron
               */
              assert.equal(op.use_index, EVALS_ASC_IDX)

              return {
                docs: [
                  mockEval,
                  mockEval
                ]
              }
            }
          },
          logger
        }))

      const res = await findEvaluations({
        processId: 'process-123',
        from: { timestamp: 1702677252111, ordinate: '3' },
        to: { timestamp: 1702677252111 },
        limit: 10,
        sort: 'ASC'
      })

      assert.equal(res.length, 2)
    })
  })

  describe('findMessageHashWith', () => {
    test('find the messageHash', async () => {
      const findMessageHash = findMessageHashSchema.implement(
        findMessageHashWith({
          pouchDb: {
            get: async () => ({
              _id: 'proc-process-123',
              parent: 'eval-123',
              type: 'messageHash'
            })
          },
          logger
        })
      )

      const res = await findMessageHash({ messageHash: 'deepHash-123' })
      assert.deepStrictEqual(res, {
        _id: 'proc-process-123',
        parent: 'eval-123',
        type: 'messageHash'
      })
    })

    test('return 404 status if not found', async () => {
      const findMessageHash = findMessageHashSchema.implement(
        findMessageHashWith({
          pouchDb: {
            get: async () => { throw { status: 404 } }
          },
          logger
        })
      )

      const res = await findMessageHash({ messageHash: 'process-123' })
        .catch(err => {
          assert.equal(err.status, 404)
          return { ok: true }
        })

      assert(res.ok)
    })

    test('bubble error', async () => {
      const findMessageId = findMessageHashSchema.implement(
        findMessageHashWith({
          pouchDb: {
            get: async () => { throw { status: 500 } }
          },
          logger
        })
      )

      await findMessageId({ messageHash: 'process-123' })
        .catch(assert.ok)
    })
  })
})
