/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { deflate } from 'node:zlib'
import { promisify } from 'node:util'

import { findEvaluationsSchema, findLatestEvaluationSchema, findMessageHashSchema, findProcessSchema, saveEvaluationSchema, saveProcessSchema } from '../dal.js'
import {
  findEvaluationsWith,
  findLatestEvaluationWith,
  findMessageHashWith,
  findProcessWith,
  saveEvaluationWith,
  saveProcessWith
} from './pouchdb.js'
import { createLogger } from '../logger.js'

const logger = createLogger('ao-cu:readState')
const deflateP = promisify(deflate)

describe('pouchdb', () => {
  describe('findProcess', () => {
    test('find the process', async () => {
      const now = Math.floor(new Date().getTime() / 1000)
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          pouchDb: {
            get: async () => ({
              _id: 'proc-process-123',
              processId: 'process-123',
              owner: 'woohoo',
              tags: [{ name: 'foo', value: 'bar' }],
              block: {
                height: 123,
                timestamp: now
              },
              type: 'process'
            })
          },
          logger
        })
      )

      const res = await findProcess({ processId: 'process-123' })
      assert.deepStrictEqual(res, {
        id: 'process-123',
        owner: 'woohoo',
        tags: [{ name: 'foo', value: 'bar' }],
        block: {
          height: 123,
          timestamp: now
        }
      })
    })

    test('return 404 status if not found', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          pouchDb: {
            get: async () => { throw { status: 404 } }
          },
          logger
        })
      )

      const res = await findProcess({ processId: 'process-123' })
        .catch(err => {
          assert.equal(err.status, 404)
          return { ok: true }
        })

      assert(res.ok)
    })

    test('bubble error', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          pouchDb: {
            get: async () => { throw { status: 500 } }
          },
          logger
        })
      )

      await findProcess({ processId: 'process-123' })
        .then(assert.fail)
        .catch(assert.ok)
    })
  })

  describe('saveProcess', () => {
    const now = Math.floor(new Date().getTime() / 1000)
    test('save the process', async () => {
      const saveProcess = saveProcessSchema.implement(
        saveProcessWith({
          pouchDb: {
            put: (doc) => {
              assert.deepStrictEqual(doc, {
                _id: 'proc-process-123',
                processId: 'process-123',
                owner: 'woohoo',
                tags: [{ name: 'foo', value: 'bar' }],
                block: {
                  height: 123,
                  timestamp: now
                },
                type: 'process'
              })
              return Promise.resolve(true)
            }
          },
          logger
        })
      )

      await saveProcess({
        id: 'process-123',
        owner: 'woohoo',
        tags: [{ name: 'foo', value: 'bar' }],
        block: {
          height: 123,
          timestamp: now
        }
      })
    })

    test('noop if the process already exists', async () => {
      const saveProcess = saveProcessSchema.implement(
        saveProcessWith({
          pouchDb: {
            put: async () => { throw { status: 409 } }
          },
          logger
        })
      )

      await saveProcess({
        id: 'process-123',
        owner: 'woohoo',
        tags: [{ name: 'foo', value: 'bar' }],
        block: {
          height: 123,
          timestamp: now
        }
      })
    })
  })

  describe('findLatestEvaluation', () => {
    test('return the lastest evaluation', async () => {
      const evaluatedAt = new Date().toISOString()
      const Memory = Buffer.from('Hello World', 'utf-8')

      const findLatestEvaluation = findLatestEvaluationSchema.implement(
        findLatestEvaluationWith({
          pouchDb: {
            allDocs: async (op) => {
              return {
                rows: [
                  {
                    doc: {
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
        to: 1702677252111
      })

      assert.equal(res.timestamp, 1702677252111)
      assert.equal(res.ordinate, 1)
      assert.equal(res.blockHeight, 1234)
      assert.equal(res.processId, 'process-123')
      assert.deepStrictEqual(res.output, { Memory, Messages: [{ foo: 'bar' }] })
      assert.equal(res.evaluatedAt.toISOString(), evaluatedAt)
    })

    test("without 'to', return the lastest interaction using collation sequence max char", async () => {
      const evaluatedAt = new Date().toISOString()
      const Memory = Buffer.from('Hello World', 'utf-8')

      const findLatestEvaluation = findLatestEvaluationSchema.implement(
        findLatestEvaluationWith({
          pouchDb: {
            allDocs: async (op) => {
              return {
                rows: [
                  {
                    doc: {
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
        processId: 'process-123'
      })

      assert.equal(res.timestamp, 1702677252111)
      assert.equal(res.ordinate, 1)
      assert.equal(res.blockHeight, 1234)
      assert.equal(res.processId, 'process-123')
      assert.deepStrictEqual(res.output, { Memory, Messages: [{ foo: 'bar' }] })
      assert.equal(res.evaluatedAt.toISOString(), evaluatedAt)
    })

    test('rejects if no interaction is found', async () => {
      const findLatestEvaluation = findLatestEvaluationSchema.implement(
        findLatestEvaluationWith({
          pouchDb: {
            allDocs: async () => ({ rows: [] })
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
    test('return the list of all evaluations', async () => {
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

      const res = await findEvaluations({ processId: 'process-123', cron: true })

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
        from: 1702677252111,
        to: 1702677252111,
        cron: true
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
