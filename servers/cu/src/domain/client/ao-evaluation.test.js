/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { findEvaluationsSchema, findLatestEvaluationsSchema, saveEvaluationSchema } from '../dal.js'
import { findEvaluationsWith, findLatestEvaluationsWith, saveEvaluationWith } from './ao-evaluation.js'
import { createLogger } from '../logger.js'
import { CRON_EVALS_ASC_IDX, EVALS_ASC_IDX } from './pouchdb.js'

const logger = createLogger('ao-cu:readState')

describe('ao-evaluation', () => {
  describe('findLatestEvaluation', () => {
    test('return the lastest evaluation for the process', async () => {
      const evaluatedAt = new Date().toISOString()

      const findLatestEvaluations = findLatestEvaluationsSchema.implement(
        findLatestEvaluationsWith({
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
            }
          },
          logger
        }))

      const [res] = await findLatestEvaluations({
        processId: 'process-123',
        to: 1702677252111,
        ordinate: '1',
        cron: '1-10-minutes'
      })

      assert.equal(res.timestamp, 1702677252111)
      assert.equal(res.ordinate, '1')
      assert.equal(res.blockHeight, 1234)
      assert.equal(res.processId, 'process-123')
      assert.deepStrictEqual(res.output, { Messages: [{ foo: 'bar' }] })
      assert.equal(res.evaluatedAt.toISOString(), evaluatedAt)
    })

    test('returns empty list if no evaluations are found', async () => {
      const findLatestEvaluations = findLatestEvaluationsSchema.implement(
        findLatestEvaluationsWith({
          pouchDb: {
            find: async () => ({ docs: [] })
          },
          logger
        })
      )

      const res = await findLatestEvaluations({
        processId: 'process-123',
        to: '1702677252111'
      })

      assert.equal(res.length, 0)
    })
  })

  describe('saveEvaluation', () => {
    test('save the evaluation and the messageHash', async () => {
      const evaluatedAt = new Date().toISOString()

      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          pouchDb: {
            put: async (evaluationDoc) => {
              const { evaluatedAt, ...rest } = evaluationDoc

              assert.deepStrictEqual(rest, {
                _id: 'eval-process-123,1702677252111,1',
                cron: undefined,
                deepHash: 'deepHash-123',
                timestamp: 1702677252111,
                nonce: 1,
                epoch: 0,
                ordinate: '1',
                blockHeight: 1234,
                processId: 'process-123',
                messageId: 'message-123',
                parent: 'proc-process-123',
                output: { Messages: [{ foo: 'bar' }] },
                type: 'evaluation'
              })
              assert.equal(evaluatedAt.toISOString(), evaluatedAt.toISOString())

              return Promise.resolve('eval-process-123,1702677252111,1')
            }
          },
          logger
        })
      )

      await saveEvaluation({
        deepHash: 'deepHash-123',
        timestamp: 1702677252111,
        nonce: '1',
        epoch: 0,
        ordinate: 1,
        blockHeight: 1234,
        processId: 'process-123',
        messageId: 'message-123',
        output: { Messages: [{ foo: 'bar' }], Memory: 'foo' },
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

  describe.todo('findMessageHashBefore')

  // describe('findMessageHashWith', () => {
  //   test('find the messageHash', async () => {
  //     const findMessageHash = findMessageHashBeforeSchema.implement(
  //       findMessageHashWith({
  //         pouchDb: {
  //           get: async () => ({
  //             _id: 'proc-process-123',
  //             parent: 'eval-123',
  //             type: 'messageHash'
  //           })
  //         },
  //         logger
  //       })
  //     )

  //     const res = await findMessageHash({ messageHash: 'deepHash-123' })
  //     assert.deepStrictEqual(res, {
  //       _id: 'proc-process-123',
  //       parent: 'eval-123',
  //       type: 'messageHash'
  //     })
  //   })

  //   test('return 404 status if not found', async () => {
  //     const findMessageHash = findMessageHashBeforeSchema.implement(
  //       findMessageHashWith({
  //         pouchDb: {
  //           get: async () => { throw { status: 404 } }
  //         },
  //         logger
  //       })
  //     )

  //     const res = await findMessageHash({ messageHash: 'process-123' })
  //       .catch(err => {
  //         assert.equal(err.status, 404)
  //         return { ok: true }
  //       })

  //     assert(res.ok)
  //   })

  //   test('bubble error', async () => {
  //     const findMessageId = findMessageHashBeforeSchema.implement(
  //       findMessageHashWith({
  //         pouchDb: {
  //           get: async () => { throw { status: 500 } }
  //         },
  //         logger
  //       })
  //     )

  //     await findMessageId({ messageHash: 'process-123' })
  //       .catch(assert.ok)
  //   })
  // })
})
