/* eslint-disable no-throw-literal */
import { describe, test, before } from 'node:test'
import * as assert from 'node:assert'

import ms from 'ms'
import { countBy, uniq, uniqBy } from 'ramda'

import { CRON_INTERVAL, parseCrons, isBlockOnCron, isTimestampOnCron, cronMessagesBetweenWith, mergeBlocks } from './loadMessages.js'

describe('loadMessages', () => {
  describe('parseCrons', () => {
    test('parses the crons from the tags', async () => {
      /**
       * Purposefully mixed up to test robustness of parsing queue
       */
      const tags = [
        { name: 'Foo', value: 'Bar' },
        { name: CRON_INTERVAL, value: '10-blocks' },
        { name: 'Cron-Tag-function', value: 'notify' },
        { name: 'Cron-Tag-notify-function', value: 'transfer' },
        { name: 'Random', value: 'Tag' },
        { name: CRON_INTERVAL, value: ' 10-minutes ' },
        { name: 'Cron-Tag-function', value: 'notify' },
        { name: 'Cron-Tag-notify-function', value: 'transfer' },
        { name: CRON_INTERVAL, value: '1 hour' },
        { name: 'Another', value: 'Tag' },
        { name: 'Cron-Tag-Function', value: 'transfer' }
      ]

      const [blocks, staticTime] = await parseCrons({ tags })
        .toPromise()

      assert.deepStrictEqual(blocks, {
        value: 10,
        unit: 'blocks',
        message: {
          tags: [
            { name: 'function', value: 'notify' },
            { name: 'notify-function', value: 'transfer' }
          ]
        },
        interval: '10-blocks'
      })

      assert.deepStrictEqual(staticTime, {
        value: 600,
        unit: 'seconds',
        message: {
          tags: [
            { name: 'function', value: 'notify' },
            { name: 'notify-function', value: 'transfer' }
          ]
        },
        interval: ' 10-minutes '
      })
    })

    test('return an empty array of no crons are found', async () => {
      const crons = await parseCrons({
        tags: []
      }).toPromise()

      assert.deepStrictEqual(crons, [])
    })

    test('throw if time-based cron is less than 1 second', async () => {
      await parseCrons({
        tags: [
          { name: CRON_INTERVAL, value: '500-Milliseconds' },
          { name: 'Cron-Tag-Function', value: 'transfer' }
        ]
      }).toPromise()
        .catch(err => {
          assert.equal(err.message, 'time-based cron cannot be less than 1 second')
        })
    })
  })

  describe('isBlockOnCron', () => {
    test('should return whether the block is on the cron', () => {
      assert.equal(
        isBlockOnCron({
          height: 125000,
          originHeight: 123455,
          cron: {
            interval: '5-blocks',
            unit: 'blocks',
            value: 5
          }
        }),
        true
      )

      assert.equal(
        isBlockOnCron({
          height: 125000,
          originHeight: 123457,
          cron: {
            interval: '5-blocks',
            unit: 'blocks',
            value: 5
          }
        }),
        false
      )
    })
  })

  describe('isTimestampOnCron', () => {
    test('should return whether the timestamp is on the cron', () => {
      /**
       * Timestamps the CU deals with will always be milliseconds, at the top of the SECOND
       *
       * SO in order for the test to be accurate, we truncate to floor second,
       * then convert back to milliseconds, so that we can compare on the second.
       */
      const nowSecond = Math.floor(new Date().getTime() / 1000) * 1000

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond,
          originTimestamp: nowSecond - ms('5m'),
          cron: {
            interval: '15-seconds',
            unit: 'seconds',
            value: 15
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond + ms('3m'),
          originTimestamp: nowSecond - ms('5m'),
          cron: {
            interval: '15-seconds',
            unit: 'seconds',
            value: 15
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond + ms('2m'),
          originTimestamp: nowSecond - ms('3m'),
          cron: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond + ms('10s'), // 5 seconds off cron
          originTimestamp: nowSecond - ms('5m'),
          cron: {
            interval: '15-seconds',
            unit: 'seconds',
            value: 15
          }
        }),
        false
      )

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond,
          originTimestamp: nowSecond - ms('5m'),
          cron: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond + ms('10m'),
          originTimestamp: nowSecond - ms('5m'),
          cron: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond + ms('59s'), // 1 second off cron
          originTimestamp: nowSecond - ms('5m'),
          cron: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        false
      )

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond + ms('3m'), // 2 minutes off cron
          originTimestamp: nowSecond - ms('5m'),
          cron: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        false
      )

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond + ms('6m'), // 1 minute off cron
          originTimestamp: nowSecond - ms('5m'),
          cron: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        false
      )

      assert.equal(
        isTimestampOnCron({
          timestamp: nowSecond + ms('10s'), // 10 seconds off cron
          originTimestamp: nowSecond - ms('5m'),
          cron: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        false
      )
    })
  })

  describe('cronMessagesBetween', () => {
    /**
     * Timestamps the CU deals with will always be milliseconds, at the top of the SECOND
     *
     * SO in order for the test to be accurate, we truncate to floor second,
     * then convert back to milliseconds, so that we can compare on the second.
     *
     * Switched to a default value so that actual results can be compared
     */
    const nowSecond = 1718033463000

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
    const blockCrons = [
      {
        interval: '2-blocks',
        unit: 'blocks',
        value: 2,
        message: mockCronMessage
      },
      {
        interval: '2-blocks',
        unit: 'blocks',
        value: 2,
        message: mockCronMessage
      }
    ]
    const timeCrons = [
      {
        interval: '10-minutes',
        unit: 'seconds',
        value: ms('10m') / 1000,
        message: mockCronMessage
      },
      {
        interval: '15-minutes',
        unit: 'seconds',
        value: ms('15m') / 1000,
        message: mockCronMessage
      }
    ]

    /**
     * blockRange of 5 blocks and 85 minutes
     *
     * Should produce 15 cron messages,
     * for a total of 17 including the actual messages
     */
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

    const cronMessagesBetween = cronMessagesBetweenWith({ logger: () => {}, processId, owner, originBlock, crons, blocksMeta })
    const cronMessagesBetweenBlockCrons = cronMessagesBetweenWith({ logger: () => {}, processId, owner, originBlock, crons: blockCrons, blocksMeta })
    const cronMessagesBetweenTimeCrons = cronMessagesBetweenWith({ logger: () => {}, processId, owner, originBlock, crons: timeCrons, blocksMeta })
    const genCronMessages = cronMessagesBetween(
      // left
      {
        block: {
          height: originHeight + 11,
          timestamp: scheduledMessagesStartTime
        },
        ordinate: 1
        // AoGlobal,
        // message
      },
      // right
      {
        block: {
          height: originHeight + 16,
          timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')
        }
        // AoGlobal,
        // message
      }
    )
    const genCronMessagesBlockCrons = cronMessagesBetweenBlockCrons(
      // left
      {
        block: {
          height: originHeight + 11,
          timestamp: scheduledMessagesStartTime
        },
        ordinate: 1
        // AoGlobal,
        // message
      },
      // right
      {
        block: {
          height: originHeight + 16,
          timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')
        }
        // AoGlobal,
        // message
      }
    )
    const genCronMessagesTimeCrons = cronMessagesBetweenTimeCrons(
      // left
      {
        block: {
          height: originHeight + 11,
          timestamp: scheduledMessagesStartTime
        },
        ordinate: 1
        // AoGlobal,
        // message
      },
      // right
      {
        block: {
          height: originHeight + 16,
          timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')
        }
        // AoGlobal,
        // message
      }
    )

    // These expected cron messages reflect the order the crons should be yielded in.
    // They are checked to ensure that the algorithm is yielding crons chronologically.
    const expectedCronMessages = [
      'Cron Message 1715442663000,1,0-10-minutes',
      'Cron Message 1715443263000,1,0-10-minutes',
      'Cron Message 1715443263000,1,1-15-minutes',
      'Cron Message 1715443563000,1,0-2-blocks',
      'Cron Message 1715443563000,1,1-2-blocks',
      'Cron Message 1715443863000,1,0-10-minutes',
      'Cron Message 1715444163000,1,1-15-minutes',
      'Cron Message 1715444463000,1,0-10-minutes',
      'Cron Message 1715445063000,1,0-10-minutes',
      'Cron Message 1715445063000,1,1-15-minutes',
      'Cron Message 1715445663000,1,0-10-minutes',
      'Cron Message 1715445963000,1,1-15-minutes',
      'Cron Message 1715446263000,1,0-2-blocks',
      'Cron Message 1715446263000,1,1-2-blocks',
      'Cron Message 1715446263000,1,0-10-minutes'
    ]

    const expectedBlockCronMessages = [
      'Cron Message 1715443563000,1,0-2-blocks',
      'Cron Message 1715443563000,1,1-2-blocks',
      'Cron Message 1715446263000,1,0-2-blocks',
      'Cron Message 1715446263000,1,1-2-blocks'
    ]

    const expectedTimeCronMessages = [
      'Cron Message 1715442663000,1,0-10-minutes',
      'Cron Message 1715443263000,1,0-10-minutes',
      'Cron Message 1715443263000,1,1-15-minutes',
      'Cron Message 1715443863000,1,0-10-minutes',
      'Cron Message 1715444163000,1,1-15-minutes',
      'Cron Message 1715444463000,1,0-10-minutes',
      'Cron Message 1715445063000,1,0-10-minutes',
      'Cron Message 1715445063000,1,1-15-minutes',
      'Cron Message 1715445663000,1,0-10-minutes',
      'Cron Message 1715445963000,1,1-15-minutes',
      'Cron Message 1715446263000,1,0-10-minutes'
    ]

    describe('block and time crons', () => {
      const cronMessages = []
      before(async () => {
        for await (const cron of genCronMessages) cronMessages.push(cron)
      })

      test('should create cron message according to the crons', async () => {
        console.log(countBy((node) => `${node.message.Timestamp},${node.cron}`, cronMessages))
        // Two actual messages + 15 cron messages between them
        assert.equal(cronMessages.length + 2, 17)
        // Asserts uniqueness
        assert.deepStrictEqual(uniq(expectedCronMessages).length, uniq(cronMessages).length)
        // Asserts order
        assert.deepStrictEqual(cronMessages.map((msg) => msg.name), expectedCronMessages)
      })

      test('should create a unique cron identifier for each generated message', async () => {
        assert.equal(
          cronMessages.length,
          uniqBy((node) => `${node.message.Timestamp},${node.ordinate},${node.cron}`, cronMessages).length
        )
      })
    })

    describe('block crons only', () => {
      const cronMessages = []
      before(async () => {
        for await (const cron of genCronMessagesBlockCrons) cronMessages.push(cron)
      })

      test('should create cron message according to the crons', async () => {
        console.log(countBy((node) => `${node.message.Timestamp},${node.cron}`, cronMessages))
        // Two actual messages + 15 cron messages between them
        assert.equal(cronMessages.length + 2, 6)

        // Asserts uniqueness
        assert.deepStrictEqual(uniq(expectedBlockCronMessages).length, uniq(cronMessages).length)
        // Asserts order
        assert.deepStrictEqual(cronMessages.map((msg) => msg.name), expectedBlockCronMessages)
      })

      test('should create a unique cron identifier for each generated message', async () => {
        assert.equal(
          cronMessages.length,
          uniqBy((node) => `${node.message.Timestamp},${node.ordinate},${node.cron}`, cronMessages).length
        )
      })
    })

    describe('time crons only', () => {
      const cronMessages = []
      before(async () => {
        for await (const cron of genCronMessagesTimeCrons) cronMessages.push(cron)
      })

      test('should create cron message according to the crons', async () => {
        console.log(countBy((node) => `${node.message.Timestamp},${node.cron}`, cronMessages))
        // Two actual messages + 15 cron messages between them
        assert.equal(cronMessages.length + 2, 13)
        // Asserts uniqueness
        assert.deepStrictEqual(uniq(expectedTimeCronMessages).length, uniq(cronMessages).length)
        // Asserts order
        assert.deepStrictEqual(cronMessages.map((msg) => msg.name), expectedTimeCronMessages)
      })

      test('should create a unique cron identifier for each generated message', async () => {
        assert.equal(
          cronMessages.length,
          uniqBy((node) => `${node.message.Timestamp},${node.ordinate},${node.cron}`, cronMessages).length
        )
      })
    })
  })

  describe('mergeBlocks', () => {
    test('should merge the blocks into a single sorted list', () => {
      const fromDb = [
        { height: 10, timestamp: 123 },
        { height: 11, timestamp: 456 },
        { height: 15, timestamp: 789 },
        { height: 16, timestamp: 1234 }
      ]

      const fromGateway = [
        { height: 11, timestamp: 456 },
        { height: 12, timestamp: 457 },
        { height: 13, timestamp: 458 },
        { height: 14, timestamp: 459 },
        { height: 15, timestamp: 460 }
      ]

      assert.deepStrictEqual(
        mergeBlocks(fromDb, fromGateway),
        [
          { height: 10, timestamp: 123 },
          { height: 11, timestamp: 456 },
          { height: 12, timestamp: 457 },
          { height: 13, timestamp: 458 },
          { height: 14, timestamp: 459 },
          { height: 15, timestamp: 460 },
          { height: 16, timestamp: 1234 }
        ]
      )
    })
  })

  describe.todo('loadMessages', () => {})
})
