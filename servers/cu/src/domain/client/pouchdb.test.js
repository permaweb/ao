/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { deflate } from 'node:zlib'
import { promisify } from 'node:util'

import { findEvaluationsSchema, findLatestEvaluationSchema, findProcessSchema, saveEvaluationSchema, saveProcessSchema } from '../dal.js'
import {
  COLLATION_SEQUENCE_MAX_CHAR,
  findEvaluationsWith,
  findLatestEvaluationWith,
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
              _id: 'process-123',
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

    test('bubble error', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          pouchDb: {
            get: async () => { throw { status: 404 } }
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
            get: async () => undefined,
            put: (doc) => {
              assert.deepStrictEqual(doc, {
                _id: 'process-123',
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
            get: async () => ({
              _id: 'process-123',
              owner: 'woohoo',
              tags: [{ name: 'foo', value: 'bar' }],
              block: {
                height: 123,
                timestamp: now
              }
            }),
            put: assert.fail
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
      const buffer = Buffer.from('Hello World', 'utf-8')

      const findLatestEvaluation = findLatestEvaluationSchema.implement(
        findLatestEvaluationWith({
          pouchDb: {
            find: async (op) => {
              assert.deepStrictEqual(op, {
                selector: {
                  _id: {
                    $gte: 'process-123,',
                    $lte: 'process-123,sortkey-910'
                  }
                },
                sort: [{ _id: 'desc' }],
                limit: 1
              })
              return {
                docs: [
                  {
                    _id: 'process-123,sortkey-890',
                    sortKey: 'sortkey-890',
                    parent: 'process-123',
                    output: { messages: [{ foo: 'bar' }] },
                    evaluatedAt,
                    type: 'evaluation'
                  }
                ]
              }
            },
            getAttachment: async (_id, name) => {
              assert.equal(_id, 'process-123,sortkey-890')
              assert.equal(name, 'buffer.txt')
              // impl will inflate this buffer
              return deflateP(buffer)
            }
          },
          logger
        }))

      const res = await findLatestEvaluation({
        processId: 'process-123',
        to: 'sortkey-910'
      })

      assert.equal(res.sortKey, 'sortkey-890')
      assert.equal(res.processId, 'process-123')
      assert.deepStrictEqual(res.output, { buffer, messages: [{ foo: 'bar' }] })
      assert.equal(res.evaluatedAt.toISOString(), evaluatedAt)
    })

    test("without 'to', return the lastest interaction using collation sequence max char", async () => {
      const evaluatedAt = new Date().toISOString()
      const buffer = Buffer.from('Hello World', 'utf-8')

      const findLatestEvaluation = findLatestEvaluationSchema.implement(
        findLatestEvaluationWith({
          pouchDb: {
            find: async (op) => {
              assert.deepStrictEqual(op, {
                selector: {
                  _id: {
                    $gte: 'process-123,',
                    $lte: `process-123,${COLLATION_SEQUENCE_MAX_CHAR}`
                  }
                },
                sort: [{ _id: 'desc' }],
                limit: 1
              })
              return {
                docs: [
                  {
                    _id: 'process-123,sortkey-890',
                    sortKey: 'sortkey-890',
                    parent: 'process-123',
                    output: { messages: [{ foo: 'bar' }] },
                    evaluatedAt,
                    type: 'evaluation'
                  }
                ]
              }
            },
            getAttachment: async (_id, name) => {
              assert.equal(_id, 'process-123,sortkey-890')
              assert.equal(name, 'buffer.txt')
              // impl will inflate this buffer
              return deflateP(buffer)
            }
          },
          logger
        }))

      const res = await findLatestEvaluation({
        processId: 'process-123'
      })

      assert.equal(res.sortKey, 'sortkey-890')
      assert.equal(res.processId, 'process-123')
      assert.deepStrictEqual(res.output, { buffer, messages: [{ foo: 'bar' }] })
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
        to: 'sortkey-910'
      })
        .then(assert.fail)
        .catch(() => assert.ok(true))
    })
  })

  describe('saveEvaluation', () => {
    test('save the evaluation to pouchdb with the buffer as an attachment', async () => {
      const evaluatedAt = new Date().toISOString()
      const buffer = Buffer.from('Hello World', 'utf-8')

      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          pouchDb: {
            get: async () => undefined,
            put: async (doc) => {
              assert.equal(doc._id, 'process-123,sortkey-890')
              assert.equal(doc.sortKey, 'sortkey-890')
              assert.equal(doc.parent, 'process-123')
              // buffer is omitted from output and moved to _attachments
              assert.deepStrictEqual(doc.output, { messages: [{ foo: 'bar' }] })
              assert.deepStrictEqual(doc._attachments, {
                'buffer.txt': {
                  content_type: 'text/plain',
                  /**
                   * zlib compress the buffer before persisting
                   *
                   * In testing, this results in orders of magnitude
                   * smaller buffer and smaller persistence times
                   */
                  data: await deflateP(buffer)
                }
              })
              assert.equal(doc.evaluatedAt.toISOString(), evaluatedAt)
              return Promise.resolve(true)
            }
          },
          logger
        })
      )

      await saveEvaluation({
        sortKey: 'sortkey-890',
        processId: 'process-123',
        output: { buffer, messages: [{ foo: 'bar' }] },
        evaluatedAt
      })
    })

    test('noop if the interaction already exists', async () => {
      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          pouchDb: {
            get: async () => ({
              _id: 'process-123,sortkey-890',
              sortKey: 'sortkey-890',
              parent: 'process-123',
              output: { buffer: Buffer.from('Hello World', 'utf-8'), messages: [{ foo: 'bar' }] },
              evaluatedAt: new Date()
            }),
            put: assert.fail
          },
          logger
        })
      )

      await saveEvaluation({
        sortKey: 'sortkey-890',
        processId: 'process-123',
        output: { buffer: Buffer.from('Hello World', 'utf-8'), messages: [{ foo: 'bar' }] },
        evaluatedAt: new Date()
      })
    })
  })

  describe('findEvaluations', () => {
    test('return the list of all evaluations', async () => {
      const evaluatedAt = new Date().toISOString()
      const mockEval = {
        _id: 'process-123,sortkey-890',
        sortKey: 'sortkey-890',
        parent: 'process-123',
        output: { state: { foo: 'bar' } },
        evaluatedAt,
        type: 'evaluation'
      }
      const findEvaluations = findEvaluationsSchema.implement(
        findEvaluationsWith({
          pouchDb: {
            find: async (op) => {
              assert.deepStrictEqual(op, {
                selector: {
                  _id: {
                    $gte: 'process-123,',
                    $lte: `process-123,${COLLATION_SEQUENCE_MAX_CHAR}`
                  }
                },
                sort: [{ _id: 'asc' }],
                limit: Number.MAX_SAFE_INTEGER
              })
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

      const res = await findEvaluations({ processId: 'process-123' })

      assert.equal(res.length, 2)
    })

    test("return the evaluations between 'from' and 'to'", async () => {
      const evaluatedAt = new Date().toISOString()
      const mockEval = {
        _id: 'process-123,sortkey-890',
        sortKey: 'sortkey-890',
        parent: 'process-123',
        output: { state: { foo: 'bar' } },
        evaluatedAt,
        type: 'evaluation'
      }
      const findEvaluations = findEvaluationsSchema.implement(
        findEvaluationsWith({
          pouchDb: {
            find: async (op) => {
              assert.deepStrictEqual(op, {
                selector: {
                  _id: {
                    $gte: 'process-123,sortkey-123,',
                    $lte: `process-123,sortkey-456,${COLLATION_SEQUENCE_MAX_CHAR}`
                  }
                },
                sort: [{ _id: 'asc' }],
                limit: Number.MAX_SAFE_INTEGER
              })
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
        from: 'sortkey-123',
        to: 'sortkey-456'
      })

      assert.equal(res.length, 2)
    })
  })
})
