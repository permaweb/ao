/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createTestLogger } from '../domain/logger.js'
import { findEvaluationSchema, findEvaluationsSchema, findMessageBeforeSchema, saveEvaluationSchema } from '../domain/dal.js'
import { findMessageBeforeWith, findEvaluationWith, findEvaluationsWith, saveEvaluationWith } from './ao-evaluation.js'
import { COLLATION_SEQUENCE_MAX_CHAR, EVALUATIONS_TABLE, MESSAGES_TABLE } from './db.js'

const logger = createTestLogger({ name: 'ao-cu:readState' })

describe('ao-evaluation', () => {
  describe('findEvaluation', () => {
    const evaluatedAt = new Date()

    test('find the evaluation', async () => {
      const findEvaluation = findEvaluationSchema.implement(
        findEvaluationWith({
          db: {
            engine: 'sqlite',
            query: async ({ parameters }) => {
              assert.deepStrictEqual(parameters, ['process-123,1702677252111,1'])

              return [{
                id: 'process-123,1702677252111,1',
                processId: 'process-123',
                messageId: 'message-123',
                deepHash: 'deepHash-123',
                nonce: 1,
                epoch: 0,
                timestamp: 1702677252111,
                ordinate: '1',
                blockHeight: 1234,
                cron: undefined,
                evaluatedAt: evaluatedAt.getTime(),
                output: JSON.stringify({ Messages: [{ foo: 'bar' }] })
              }]
            }
          }
        })
      )

      const res = await findEvaluation({
        processId: 'process-123',
        to: 1702677252111,
        ordinate: '1',
        cron: undefined
      })

      assert.deepStrictEqual(res, {
        processId: 'process-123',
        messageId: 'message-123',
        deepHash: 'deepHash-123',
        nonce: 1,
        epoch: 0,
        timestamp: 1702677252111,
        ordinate: '1',
        blockHeight: 1234,
        cron: undefined,
        evaluatedAt,
        output: { Messages: [{ foo: 'bar' }] }
      })
    })

    test('return 404 status if not found', async () => {
      const findEvaluation = findEvaluationSchema.implement(
        findEvaluationWith({
          db: {
            engine: 'sqlite',
            query: async () => []
          },
          logger
        })
      )

      const res = await findEvaluation({
        processId: 'process-123',
        to: 1702677252111,
        ordinate: '1',
        cron: undefined
      })
        .catch(err => {
          assert.equal(err.status, 404)
          return { ok: true }
        })

      assert(res.ok)
    })
  })

  describe('saveEvaluation', () => {
    const evaluatedAt = new Date()
    describe('save the evaluation and message', () => {
      const args = {
        isAssignment: false,
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
      }

      test('use deepHash as the messageDocId', async () => {
        const saveEvaluation = saveEvaluationSchema.implement(
          saveEvaluationWith({
            db: {
              engine: 'sqlite',
              transaction: async ([{ parameters: evaluationDocParams }, { parameters: messageDocParams }]) => {
                assert.deepStrictEqual(evaluationDocParams, [
                  'process-123,1702677252111,1',
                  'process-123',
                  'message-123',
                  'deepHash-123',
                  1,
                  0,
                  1702677252111,
                  '1',
                  1234,
                  undefined,
                  evaluatedAt.getTime(),
                  JSON.stringify({ Messages: [{ foo: 'bar' }] })
                ])

                assert.deepStrictEqual(messageDocParams, [
                  'deepHash-123',
                  'process-123',
                  '0:1'
                ])

                return Promise.resolve('process-123,1702677252111,1')
              }
            },
            logger
          })
        )

        await saveEvaluation(args)
      })

      test('use messageId as the messageDocId if assignment', async () => {
        const saveEvaluation = saveEvaluationSchema.implement(
          saveEvaluationWith({
            db: {
              engine: 'sqlite',
              transaction: async ([{ parameters: evaluationDocParams }, { parameters: messageDocParams }]) => {
                assert.deepStrictEqual(evaluationDocParams, [
                  'process-123,1702677252111,1',
                  'process-123',
                  'message-123',
                  'deepHash-123',
                  1,
                  0,
                  1702677252111,
                  '1',
                  1234,
                  undefined,
                  evaluatedAt.getTime(),
                  JSON.stringify({ Messages: [{ foo: 'bar' }] })
                ])

                assert.deepStrictEqual(messageDocParams, [
                  'message-123',
                  'process-123',
                  '0:1'
                ])

                return Promise.resolve('process-123,1702677252111,1')
              }
            },
            logger
          })
        )

        // isAssignment
        await saveEvaluation({
          ...args,
          isAssignment: true
        })
      })

      test('use messageId as the messageDocId if no deepHash', async () => {
        const saveEvaluation = saveEvaluationSchema.implement(
          saveEvaluationWith({
            db: {
              engine: 'sqlite',
              transaction: async ([{ parameters: evaluationDocParams }, { parameters: messageDocParams }]) => {
                assert.deepStrictEqual(evaluationDocParams, [
                  'process-123,1702677252111,1',
                  'process-123',
                  'message-123',
                  undefined,
                  1,
                  0,
                  1702677252111,
                  '1',
                  1234,
                  undefined,
                  evaluatedAt.getTime(),
                  JSON.stringify({ Messages: [{ foo: 'bar' }] })
                ])

                assert.deepStrictEqual(messageDocParams, [
                  'message-123',
                  'process-123',
                  '0:1'
                ])

                return Promise.resolve('process-123,1702677252111,1')
              }
            },
            logger
          })
        )

        // no deepHash
        await saveEvaluation({
          ...args,
          deepHash: undefined
        })
      })
    })

    test('noop insert evaluation or message if it already exists', async () => {
      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          db: {
            engine: 'sqlite',
            transaction: async ([{ sql: evaluationDocSql }, { sql: messageDocSql }]) => {
              assert.ok(evaluationDocSql.trim().startsWith(`INSERT OR IGNORE INTO ${EVALUATIONS_TABLE}`))
              assert.ok(messageDocSql.trim().startsWith(`INSERT OR IGNORE INTO ${MESSAGES_TABLE}`))

              return Promise.resolve('process-123,1702677252111,1')
            }
          },
          logger
        })
      )

      await saveEvaluation({
        isAssignment: false,
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

    test('noop insert evaluation if DISABLE_PROCESS_EVALUATION_CACHE', async () => {
      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          DISABLE_PROCESS_EVALUATION_CACHE: true,
          db: {
            engine: 'sqlite',
            transaction: async (statements) => {
              assert.equal(statements.length, 1)
              const [{ sql: messageDocSql }] = statements
              assert.ok(messageDocSql.trim().startsWith(`INSERT OR IGNORE INTO ${MESSAGES_TABLE}`))

              return Promise.resolve('process-123,1702677252111,1')
            }
          },
          logger
        })
      )

      await saveEvaluation({
        isAssignment: false,
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
      const evaluatedAt = new Date()
      const mockEval = {
        id: 'process-123,1702677252111',
        timestamp: 1702677252111,
        ordinate: '1',
        blockHeight: 1234,
        processId: 'process-123',
        messageId: 'message-123',
        output: JSON.stringify({ }),
        evaluatedAt: evaluatedAt.getTime()
      }
      const findEvaluations = findEvaluationsSchema.implement(
        findEvaluationsWith({
          db: {
            engine: 'sqlite',
            query: async ({ sql, parameters }) => {
              assert.ok(sql.includes('AND cron IS NOT NULL'))
              assert.ok(sql.includes('timestamp ASC'))
              assert.ok(sql.includes('ordinate ASC'))
              assert.ok(sql.includes('cron ASC'))

              assert.deepStrictEqual(parameters, [
                'process-123,', // gt
                `process-123,${COLLATION_SEQUENCE_MAX_CHAR}`, // lte
                10 // limit
              ])

              return [
                mockEval,
                mockEval
              ]
            }
          },
          logger
        }))

      const res = await findEvaluations({ processId: 'process-123', limit: 10, sort: 'ASC', onlyCron: true })

      assert.equal(res.length, 2)
    })

    test("return the evaluations between 'from' and 'to'", async () => {
      const evaluatedAt = new Date()
      const mockEval = {
        id: 'process-123,1702677252111',
        timestamp: 1702677252111,
        ordinate: '1',
        blockHeight: 1234,
        processId: 'process-123',
        messageId: 'message-123',
        output: JSON.stringify({ state: { foo: 'bar' } }),
        evaluatedAt: evaluatedAt.getTime()
      }
      const findEvaluations = findEvaluationsSchema.implement(
        findEvaluationsWith({
          db: {
            engine: 'sqlite',
            query: async ({ sql, parameters }) => {
              /**
               * no onlyCron
               */
              assert.ok(!sql.includes('AND cron IS NOT NULL'))

              assert.deepStrictEqual(parameters, [
                'process-123,1702677252111,3', // gt
                `process-123,1702677252111,${COLLATION_SEQUENCE_MAX_CHAR}`, // lte
                10 // limit
              ])

              return [
                mockEval,
                mockEval
              ]
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

  describe('findMessageBeforeWith', () => {
    test('find the prior message by deepHash', async () => {
      const findMessageBefore = findMessageBeforeSchema.implement(
        findMessageBeforeWith({
          db: {
            engine: 'sqlite',
            query: async ({ parameters }) => {
              assert.deepStrictEqual(parameters, [
                'deepHash-123',
                'process-123',
                0,
                0,
                3
              ])

              const mockAssigment = {
                id: 'deepHash-123',
                processId: 'process-123',
                seq: '0:3'
              }

              return [mockAssigment]
            }
          }
        })
      )

      const res = await findMessageBefore({
        processId: 'process-123',
        messageId: 'message-123',
        deepHash: 'deepHash-123',
        isAssignment: false,
        epoch: 0,
        nonce: 3
      })

      assert.deepStrictEqual(res, { id: 'deepHash-123' })
    })

    describe('find the prior message by messageId', () => {
      test('if no deepHash was calculated', async () => {
        const findMessageBefore = findMessageBeforeSchema.implement(
          findMessageBeforeWith({
            db: {
              engine: 'sqlite',
              query: async ({ parameters }) => {
                assert.deepStrictEqual(parameters, [
                  'message-123',
                  'process-123',
                  0,
                  0,
                  3
                ])

                const mockAssigment = {
                  id: 'message-123',
                  processId: 'process-123',
                  seq: '0:3'
                }

                return [mockAssigment]
              }
            }
          })
        )

        const res = await findMessageBefore({
          processId: 'process-123',
          messageId: 'message-123',
          deepHash: undefined,
          isAssignment: false,
          epoch: 0,
          nonce: 3
        })

        assert.deepStrictEqual(res, { id: 'message-123' })
      })

      test('if it is an assignment', async () => {
        const findMessageBefore = findMessageBeforeSchema.implement(
          findMessageBeforeWith({
            db: {
              engine: 'sqlite',
              query: async ({ sql, parameters }) => {
                // Only the postgres engine uses POSITION
                assert.ok(!sql.includes('POSITION'))
                assert.deepStrictEqual(parameters, [
                  'message-123',
                  'process-123',
                  0,
                  0,
                  3
                ])

                const mockAssigment = {
                  id: 'message-123',
                  processId: 'process-123',
                  seq: '0:3'
                }

                return [mockAssigment]
              }
            }
          })
        )

        const res = await findMessageBefore({
          processId: 'process-123',
          messageId: 'message-123',
          deepHash: 'deepHash-123',
          isAssignment: true,
          epoch: 0,
          nonce: 3
        })

        assert.deepStrictEqual(res, { id: 'message-123' })
      })
      test('if it is an assignment, postgres', async () => {
        const findMessageBefore = findMessageBeforeSchema.implement(
          findMessageBeforeWith({
            db: {
              engine: 'postgres',
              query: async ({ sql, parameters }) => {
                // Only the postgres engine uses POSITION
                assert.ok(sql.includes('POSITION'))
                assert.deepStrictEqual(parameters, [
                  'message-123',
                  'process-123',
                  0,
                  0,
                  3
                ])

                const mockAssigment = {
                  id: 'message-123',
                  processId: 'process-123',
                  seq: '0:3'
                }

                return [mockAssigment]
              }
            }
          })
        )

        const res = await findMessageBefore({
          processId: 'process-123',
          messageId: 'message-123',
          deepHash: 'deepHash-123',
          isAssignment: true,
          epoch: 0,
          nonce: 3
        })

        assert.deepStrictEqual(res, { id: 'message-123' })
      })
    })

    test('return 404 status if not found', async () => {
      const findMessageBefore = findMessageBeforeSchema.implement(
        findMessageBeforeWith({
          db: {
            engine: 'sqlite',
            query: async () => []
          },
          logger
        })
      )

      const res = await findMessageBefore({
        processId: 'process-123',
        messageId: 'message-123',
        deepHash: 'deepHash-123',
        isAssignment: true,
        epoch: 0,
        nonce: 3
      })
        .catch(err => {
          assert.equal(err.status, 404)
          return { ok: true }
        })

      assert(res.ok)
    })
  })
})
