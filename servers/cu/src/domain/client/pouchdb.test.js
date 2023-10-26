/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

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
                    message: { target: 'process-456', owner: 'owner-123', tags: [] },
                    output: { state: { foo: 'bar' } },
                    evaluatedAt,
                    type: 'evaluation'
                  }
                ]
              }
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
      assert.deepStrictEqual(res.message, { target: 'process-456', owner: 'owner-123', tags: [] })
      assert.deepStrictEqual(res.output, { state: { foo: 'bar' } })
      assert.equal(res.evaluatedAt.toISOString(), evaluatedAt)
    })

    test("without 'to', return the lastest interaction using collation sequence max char", async () => {
      const evaluatedAt = new Date().toISOString()
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
                    message: { target: 'process-456', owner: 'owner-123', tags: [] },
                    output: { state: { foo: 'bar' } },
                    evaluatedAt,
                    type: 'evaluation'
                  }
                ]
              }
            }
          },
          logger
        }))

      const res = await findLatestEvaluation({
        processId: 'process-123'
      })

      assert.equal(res.sortKey, 'sortkey-890')
      assert.equal(res.processId, 'process-123')
      assert.deepStrictEqual(res.message, { target: 'process-456', owner: 'owner-123', tags: [] })
      assert.deepStrictEqual(res.output, { state: { foo: 'bar' } })
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
    test('save the evaluation to pouchdb', async () => {
      const evaluatedAt = new Date().toISOString()
      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          pouchDb: {
            get: async () => undefined,
            put: (doc) => {
              assert.equal(doc._id, 'process-123,sortkey-890')
              assert.equal(doc.sortKey, 'sortkey-890')
              assert.equal(doc.parent, 'process-123')
              assert.deepStrictEqual(doc.message, { target: 'process-456', owner: 'owner-123', tags: [] })
              assert.deepStrictEqual(doc.output, { state: { foo: 'bar' } })
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
        message: { target: 'process-456', owner: 'owner-123', tags: [] },
        output: { state: { foo: 'bar' } },
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
              message: { target: 'process-456', owner: 'owner-123', tags: [] },
              output: { state: { foo: 'bar' } },
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
        message: { target: 'process-456', owner: 'owner-123', tags: [] },
        output: { state: { foo: 'bar' } },
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
        message: { target: 'process-456', owner: 'owner-123', tags: [] },
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
                sort: [{ _id: 'desc' }],
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
        message: { target: 'process-456', owner: 'owner-123', tags: [] },
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
                sort: [{ _id: 'desc' }],
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
