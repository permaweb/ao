/* eslint-disable no-throw-literal */
import { describe, test, before } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { findEvaluationSchema, findEvaluationsSchema, findMessageBeforeSchema, saveEvaluationSchema } from '../dal.js'
import { findMessageBeforeWith, findEvaluationWith, findEvaluationsWith, saveEvaluationWith, cronMessagesBetweenWith } from './ao-evaluation.js'
import { COLLATION_SEQUENCE_MAX_CHAR, EVALUATIONS_TABLE, MESSAGES_TABLE } from './sqlite.js'
import ms from 'ms'
import { readFileSync } from 'node:fs'

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

  describe('findMessageBeforeWith', () => {
    test('find the prior message by deepHash', async () => {
      const findMessageBefore = findMessageBeforeSchema.implement(
        findMessageBeforeWith({
          db: {
            query: async ({ parameters }) => {
              assert.deepStrictEqual(parameters, [
                'deepHash-123',
                'process-123',
                '0:3'
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
              query: async ({ parameters }) => {
                assert.deepStrictEqual(parameters, [
                  'message-123',
                  'process-123',
                  '0:3'
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
              query: async ({ parameters }) => {
                assert.deepStrictEqual(parameters, [
                  'message-123',
                  'process-123',
                  '0:3'
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

  describe('cronMessagesBetweenWith', () => {
    const nowSecond = Math.floor(new Date().getTime() / 1000) * 1000

    const originHeight = 125000
    const originTime = nowSecond - ms('30d')
    const mockCronMessage = {
      tags: [
        { name: 'Type', value: 'Message' },
        { name: 'function', value: 'notify' },
        { name: 'from', value: 'SIGNERS_WALLET_ADRESS' },
        { name: 'qty', value: '1000' }
      ]
    }

    const processId = 'process-123'
    const owner = 'owner-123'
    const originBlock = {
      height: originHeight,
      timestamp: originTime
    }
    const crons = [
      {
        interval: '10-minutes',
        unit: 'seconds',
        value: ms('10m') / 1000,
        message: mockCronMessage
      },
      {
        interval: '2-blocks',
        unit: 'blocks',
        value: 2,
        message: mockCronMessage
      },
      {
        interval: '15-minutes',
        unit: 'seconds',
        value: ms('15m') / 1000,
        message: mockCronMessage
      },
      {
        interval: '2-blocks',
        unit: 'blocks',
        value: 2,
        message: mockCronMessage
      }
    ]
    const scheduledMessagesStartTime = originTime + ms('20m')
    const blocksMeta = [
      // {
      //   height: originHeight + 10,
      //   timestamp: scheduledMessagesStartTime - ms('10m') - ms('10m') // 15m
      // },
      // {
      //   height: originHeight + 11,
      //   timestamp: scheduledMessagesStartTime - ms('10m') // 25m
      // },
      // The first scheduled message is on this block
      {
        height: originHeight + 12,
        timestamp: scheduledMessagesStartTime + ms('15m') // 35m
      },
      /**
       * 2 block-based:
       * - 2 @ root
       *
       * 3 time-based:
       * - 0 @ 35m
       * - 1 10_minute @ 40m
       * - 1 15_minute @ 45m
       * - 1 10_minute @ 50m
       */
      {
        height: originHeight + 13,
        timestamp: scheduledMessagesStartTime + ms('15m') + ms('16m') // 51m
      },
      /**
       * 0 block-based
       *
       * 4 time-based:
       * - 0 @ 51m
       * - 1 10_minute @ 60m
       * - 1 15_minute @ 60m
       * - 1 10_minute @ 70m
       * - 1 15_minute @ 75m
       */
      {
        height: originHeight + 14,
        timestamp: scheduledMessagesStartTime + ms('15m') + ms('16m') + ms('29m') // 80m
      },
      /**
       * 2 block-based
       * - 2 @ root
       *
       * 3 time-based:
       * - 1 10_minute @ 80m
       * - 1 15_minute @ 90m
       * - 1 10_minute @ 90m
       */
      {
        height: originHeight + 15,
        timestamp: scheduledMessagesStartTime + ms('15m') + ms('16m') + ms('29m') + ms('15m') // 95m
      },
      /**
       * 0 block-based
       *
       * 1 time-based:
       * - 0 @ 95m
       * - 1 10_minute @ 100m
       */
      {
        height: originHeight + 16,
        timestamp: scheduledMessagesStartTime + ms('15m') + ms('16m') + ms('29m') + ms('15m') + ms('10m') // 105m
      }
      /**
       * NOT SCHEDULED BECAUSE OUTSIDE BLOCK RANGE
       * 2 block-based:
       * - 2 @ root
       *
       * X time-based:
       * - 1 15_minute @ 105m
       * ....
       */
    ]

    const cronMessagesBetween = cronMessagesBetweenWith({ generateCronMessagesBetween: () => null })

    // 15 Cron Messages to write to the duplex
    // Object and Array constructors are replaced with empty object/array as the messages are stringified and then parsed when adding to file.
    const cronMessages = [
      {
        cron: '0-10-minutes',
        ordinate: 1,
        name: 'Cron Message 1714580554000,1,0-10-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714580554000,
          'Block-Height': 125011,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '0-10-minutes',
        ordinate: 1,
        name: 'Cron Message 1714581154000,1,0-10-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714581154000,
          'Block-Height': 125011,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '1-15-minutes',
        ordinate: 1,
        name: 'Cron Message 1714581154000,1,1-15-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714581154000,
          'Block-Height': 125011,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '0-2-blocks',
        ordinate: 1,
        name: 'Cron Message 1714581454000,1,0-2-blocks',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714581454000,
          'Block-Height': 125012,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '1-2-blocks',
        ordinate: 1,
        name: 'Cron Message 1714581454000,1,1-2-blocks',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714581454000,
          'Block-Height': 125012,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '0-10-minutes',
        ordinate: 1,
        name: 'Cron Message 1714581754000,1,0-10-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714581754000,
          'Block-Height': 125012,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '1-15-minutes',
        ordinate: 1,
        name: 'Cron Message 1714582054000,1,1-15-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714582054000,
          'Block-Height': 125012,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '0-10-minutes',
        ordinate: 1,
        name: 'Cron Message 1714582354000,1,0-10-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714582354000,
          'Block-Height': 125012,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '0-10-minutes',
        ordinate: 1,
        name: 'Cron Message 1714582954000,1,0-10-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714582954000,
          'Block-Height': 125013,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '1-15-minutes',
        ordinate: 1,
        name: 'Cron Message 1714582954000,1,1-15-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714582954000,
          'Block-Height': 125013,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '0-10-minutes',
        ordinate: 1,
        name: 'Cron Message 1714583554000,1,0-10-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714583554000,
          'Block-Height': 125013,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '1-15-minutes',
        ordinate: 1,
        name: 'Cron Message 1714583854000,1,1-15-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714583854000,
          'Block-Height': 125013,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '0-2-blocks',
        ordinate: 1,
        name: 'Cron Message 1714584154000,1,0-2-blocks',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714584154000,
          'Block-Height': 125014,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '1-2-blocks',
        ordinate: 1,
        name: 'Cron Message 1714584154000,1,1-2-blocks',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714584154000,
          'Block-Height': 125014,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      },
      {
        cron: '0-10-minutes',
        ordinate: 1,
        name: 'Cron Message 1714584154000,1,0-10-minutes',
        message: {
          Owner: 'owner-123',
          Target: 'process-123',
          From: 'owner-123',
          Tags: [],
          Timestamp: 1714584154000,
          'Block-Height': 125014,
          Cron: true
        },
        AoGlobal: { Process: {}, Module: {} }
      }
    ]

    describe('write', () => {
      describe('write ten or less cron messages', () => {
        const cronStream = cronMessagesBetween({
          logger,
          processId,
          owner,
          originBlock,
          crons,
          blocksMeta
        })({
          left: {
            block: {
              height: originHeight + 11,
              timestamp: scheduledMessagesStartTime
            },
            ordinate: 1
          },
          right: {
            block: {
              height: originHeight + 16,
              timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')
            }
          }
        })
        // Write 10 messages to the duplex. The first 10 should enter the memory buffer
        before(() => {
          cronMessages.slice(0, 10).forEach((msg) => {
            cronStream._write(msg)
          })
        })

        test('first 10 cron messages should load into memory', () => {
          assert.deepStrictEqual(cronStream.memoryBuffer, cronMessages.slice(0, 10))
        })

        test('file buffer should be empty', () => {
          let errorCaught = false
          try {
            readFileSync(cronStream.fileBuffer)
          } catch (_e) {
            errorCaught = true
          }
          assert.deepStrictEqual(errorCaught, true)
        })
      })

      describe('write more than ten cron messages', () => {
        const cronStream = cronMessagesBetween({
          logger,
          processId,
          owner,
          originBlock,
          crons,
          blocksMeta
        })({
          left: {
            block: {
              height: originHeight + 11,
              timestamp: scheduledMessagesStartTime
            },
            ordinate: 1
          },
          right: {
            block: {
              height: originHeight + 16,
              timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')
            }
          }
        })
        // Write all 15 messages to duplex. The first 10 should load into the memory buffer, but once it exceeds than it should all dump into a file
        before(() => {
          cronMessages.forEach((msg) => {
            cronStream._write(msg)
          })
        })

        test('all 15 crons should load into file', () => {
          // const file = readFileSync(cronStream.fileBuffer).toString()
          // const msgs = file.trim().split('\n').map(JSON.parse)
          // assert.deepStrictEqual(msgs, cronMessages)
        })

        test('memory buffer should be empty', () => {
          assert.deepStrictEqual(cronStream.memoryBuffer, [])
        })
      })
    })

    describe('read', () => {
      const cronStream = cronMessagesBetween({
        logger,
        processId,
        owner,
        originBlock,
        crons,
        blocksMeta
      })({
        left: {
          block: {
            height: originHeight + 11,
            timestamp: scheduledMessagesStartTime
          },
          ordinate: 1
        },
        right: {
          block: {
            height: originHeight + 16,
            timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')
          }
        }
      })

      // Write 10 messages to the duplex. The first 10 should enter the memory buffer
      before(() => {
        cronMessages.forEach((msg) => {
          cronStream._write(msg)
        })
      })

      test('last read should be last cron message', () => {
        let firstMsg, lastMsg
        cronStream.on('readable', () => {
          let msg
          while ((msg = cronStream.read()) !== null) {
            if (!firstMsg) firstMsg = msg
            lastMsg = msg
          }
        })

        cronStream.on('end', () => {
          assert.deepStrictEqual(firstMsg, cronMessages[0])
          assert.deepStrictEqual(lastMsg, cronMessages[cronMessages.length - 1])
        })
      })
    })

    describe('test', async () => {
      console.log('Here')
      const genCron = cronMessagesBetween({
        logger,
        processId,
        owner,
        originBlock,
        crons,
        blocksMeta
      })
      console.log(genCron(1000, 2000)._read())

      for await (const message of genCron(1000, 1200)) {
        console.log({ message })
      }
    })
  })
})
