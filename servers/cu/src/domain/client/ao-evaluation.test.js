/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { findEvaluationSchema, findEvaluationsSchema, findMessageHashBeforeSchema, saveEvaluationSchema } from '../dal.js'
import { findEvaluationWith, findEvaluationsWith, findMessageHashBeforeWith, saveEvaluationWith } from './ao-evaluation.js'
import { COLLATION_SEQUENCE_MAX_CHAR } from './sqlite.js'

const logger = createLogger('ao-cu:readState')

describe('ao-evaluation', () => {
  describe('findEvaluation', () => {
    const evaluatedAt = new Date()

    test('find the evaluation', async () => {
      const findEvaluation = findEvaluationSchema.implement(
        findEvaluationWith({
          db: {
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

    test('bubble error', async () => {
      const findEvaluation = findEvaluationSchema.implement(
        findEvaluationWith({
          db: {
            query: async () => { throw { status: 500 } }
          },
          logger
        })
      )

      await findEvaluation({
        processId: 'process-123',
        to: 1702677252111,
        ordinate: '1',
        cron: undefined
      })
        .then(assert.fail)
        .catch(assert.ok)
    })
  })

  describe('saveEvaluation', () => {
    const evaluatedAt = new Date()
    test('save the evaluation and the messageHash', async () => {
      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          db: {
            run: async ({ parameters }) => {
              assert.deepStrictEqual(parameters, [
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

              return Promise.resolve('process-123,1702677252111,1')
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

    test('noop if evaluation already exists', async () => {
      const saveEvaluation = saveEvaluationSchema.implement(
        saveEvaluationWith({
          db: {
            run: async ({ sql }) => {
              assert.ok(sql.trim().startsWith('INSERT OR IGNORE'))

              return Promise.resolve('process-123,1702677252111,1')
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

  describe('findMessageHashBefore', () => {
    test('find the prior evaluation by deepHash', async () => {
      const evaluatedAt = new Date()
      const findMessageHashBefore = findMessageHashBeforeSchema.implement(
        findMessageHashBeforeWith({
          db: {
            query: async ({ parameters }) => {
              assert.deepStrictEqual(parameters, [
                'deepHash-123',
                'process-123,',
                'process-123,1802677252111,3'
              ])

              const mockEval = {
                id: 'process-123,1702677252111,1',
                processId: 'process-123',
                messageId: 'message-123',
                deepHash: 'deepHash-123',
                nonce: 2,
                epoch: 0,
                timestamp: 1702677252111,
                ordinate: '2',
                blockHeight: 1234,
                cron: undefined,
                evaluatedAt: evaluatedAt.getTime(),
                output: JSON.stringify({ Messages: [{ foo: 'bar' }] })
              }

              return [mockEval]
            }
          }
        })
      )

      const res = await findMessageHashBefore({
        processId: 'process-123',
        timestamp: 1802677252111,
        ordinate: '3',
        messageHash: 'deepHash-123'
      })

      assert.deepStrictEqual(res, {
        processId: 'process-123',
        messageId: 'message-123',
        deepHash: 'deepHash-123',
        nonce: 2,
        epoch: 0,
        timestamp: 1702677252111,
        ordinate: '2',
        blockHeight: 1234,
        cron: undefined,
        evaluatedAt,
        output: { Messages: [{ foo: 'bar' }] }
      })
    })

    test('return 404 status if not found', async () => {
      const findMessageHashBefore = findMessageHashBeforeSchema.implement(
        findMessageHashBeforeWith({
          db: {
            query: async () => []
          },
          logger
        })
      )

      const res = await findMessageHashBefore({
        processId: 'process-123',
        timestamp: 1802677252111,
        ordinate: '3',
        messageHash: 'deepHash-123'
      })
        .catch(err => {
          assert.equal(err.status, 404)
          return { ok: true }
        })

      assert(res.ok)
    })

    test('bubble error', async () => {
      const findMessageHashBefore = findMessageHashBeforeSchema.implement(
        findMessageHashBeforeWith({
          db: {
            query: async () => { throw { status: 500 } }
          },
          logger
        })
      )

      await findMessageHashBefore({
        processId: 'process-123',
        timestamp: 1802677252111,
        ordinate: '3',
        messageHash: 'deepHash-123'
      })
        .catch(assert.ok)
    })
  })
})
