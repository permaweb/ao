/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import ms from 'ms'
import { countBy, prop, uniqBy } from 'ramda'

import { SCHEDULED_INTERVAL, SCHEDULED_MESSAGE, isBlockOnSchedule, isTimestampOnSchedule, parseSchedules, scheduleMessagesBetweenWith } from './loadMessages.js'
import { padBlockHeight } from './utils.js'

describe('loadMessages', () => {
  describe('parseSchedules', () => {
    const [action1, action2, action3] = [
      JSON.stringify({
        tags: [
          { name: 'function', value: 'notify' },
          { name: 'notify-function', value: 'transfer' }
        ]
      }),
      JSON.stringify({
        tags: [
          { name: 'function', value: 'notify' },
          { name: 'notify-function', value: 'transfer' }
        ]
      }),
      JSON.stringify({
        tags: [
          { name: 'function', value: 'transfer' }
        ]
      })
    ]
    test('parses the schedules from the tags', async () => {
      /**
       * Purposefully mixed up to test robustness of parsing queue
       */
      const tags = [
        { name: 'Foo', value: 'Bar' },
        { name: SCHEDULED_INTERVAL, value: '10-blocks' },
        { name: SCHEDULED_INTERVAL, value: ' 10-minutes ' },
        {
          name: SCHEDULED_MESSAGE,
          value: action1
        },
        { name: 'Random', value: 'Tag' },
        {
          name: SCHEDULED_MESSAGE,
          value: action2
        },
        { name: SCHEDULED_INTERVAL, value: '* 1 * * *-cron' },
        { name: 'Another', value: 'Tag' },
        {
          name: SCHEDULED_MESSAGE,
          value: action3
        }
      ]

      const [blocks, staticTime, cron] = await parseSchedules({ tags })
        .toPromise()

      assert.deepStrictEqual(blocks, {
        value: 10,
        unit: 'blocks',
        message: {
          tags: {
            'notify-function': 'transfer',
            function: 'notify'
          }
        },
        interval: '10-blocks'
      })

      assert.deepStrictEqual(staticTime, {
        value: 600,
        unit: 'seconds',
        message: {
          tags: {
            'notify-function': 'transfer',
            function: 'notify'
          }
        },
        interval: ' 10-minutes '
      })

      assert.deepStrictEqual(cron, {
        value: '* 1 * * *',
        unit: 'cron',
        message: {
          tags: {
            function: 'transfer'
          }
        },
        interval: '* 1 * * *-cron'
      })
    })

    test('return an empty array of no schedules are found', async () => {
      const schedules = await parseSchedules({
        tags: []
      }).toPromise()

      assert.deepStrictEqual(schedules, [])
    })

    test('throw if time-based schedule is less than 1 second', async () => {
      await parseSchedules({
        tags: [
          { name: SCHEDULED_INTERVAL, value: '500-Milliseconds' },
          {
            name: SCHEDULED_MESSAGE,
            value: action3
          }
        ]
      }).toPromise()
        .catch(err => {
          assert.equal(err.message, 'time-based interval cannot be less than 1 second')
        })
    })
  })

  describe('isBlockOnSchedule', () => {
    test('should return whether the block is on the schedule', () => {
      assert.equal(
        isBlockOnSchedule({
          height: 125000,
          originHeight: 123455,
          schedule: {
            interval: '5-blocks',
            unit: 'blocks',
            value: 5
          }
        }),
        true
      )

      assert.equal(
        isBlockOnSchedule({
          height: 125000,
          originHeight: 123457,
          schedule: {
            interval: '5-blocks',
            unit: 'blocks',
            value: 5
          }
        }),
        false
      )
    })
  })

  describe('isTimestampOnSchedule', () => {
    test('should return whether the timestamp is on the schedule', () => {
      /**
       * Timestamps the CU deals with will always be milliseconds, at the top of the SECOND
       *
       * SO in order for the test to be accurate, we truncate to floor second,
       * then convert back to milliseconds, so that we can compare on the second.
       */
      const nowSecond = Math.floor(new Date().getTime() / 1000) * 1000

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond,
          originTimestamp: nowSecond - ms('5m'),
          schedule: {
            interval: '15-seconds',
            unit: 'seconds',
            value: 15
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond + ms('3m'),
          originTimestamp: nowSecond - ms('5m'),
          schedule: {
            interval: '15-seconds',
            unit: 'seconds',
            value: 15
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond + ms('2m'),
          originTimestamp: nowSecond - ms('3m'),
          schedule: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond + ms('10s'), // 5 seconds off schedule
          originTimestamp: nowSecond - ms('5m'),
          schedule: {
            interval: '15-seconds',
            unit: 'seconds',
            value: 15
          }
        }),
        false
      )

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond,
          originTimestamp: nowSecond - ms('5m'),
          schedule: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond + ms('10m'),
          originTimestamp: nowSecond - ms('5m'),
          schedule: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        true
      )

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond + ms('59s'), // 1 second off schedule
          originTimestamp: nowSecond - ms('5m'),
          schedule: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        false
      )

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond + ms('3m'), // 2 minutes off schedule
          originTimestamp: nowSecond - ms('5m'),
          schedule: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        false
      )

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond + ms('6m'), // 1 minute off schedule
          originTimestamp: nowSecond - ms('5m'),
          schedule: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        false
      )

      assert.equal(
        isTimestampOnSchedule({
          timestamp: nowSecond + ms('10s'), // 10 seconds off schedule
          originTimestamp: nowSecond - ms('5m'),
          schedule: {
            interval: '5-minutes',
            unit: 'seconds',
            value: ms('5m') / 1000
          }
        }),
        false
      )
    })
  })

  describe('scheduleMessagesBetween', () => {
    /**
     * Timestamps the CU deals with will always be milliseconds, at the top of the SECOND
     *
     * SO in order for the test to be accurate, we truncate to floor second,
     * then convert back to milliseconds, so that we can compare on the second.
     */
    const nowSecond = Math.floor(new Date().getTime() / 1000) * 1000

    const originHeight = 125000
    const originTime = nowSecond - ms('30d')
    const mockScheduledMessage = {
      'ao-type': 'message',
      function: 'notify',
      'notify-function': 'transfer',
      from: 'SIGNERS_WALLET_ADDRESS',
      qty: '1000'
    }

    const processId = 'process-123'
    const owner = 'owner-123'
    const originBlock = {
      height: originHeight,
      timestamp: originTime
    }
    const schedules = [
      {
        interval: '10-minutes',
        unit: 'seconds',
        value: ms('10m') / 1000,
        message: mockScheduledMessage
      },
      {
        interval: '2-blocks',
        unit: 'blocks',
        value: 2,
        message: mockScheduledMessage
      },
      {
        interval: '15-minutes',
        unit: 'seconds',
        value: ms('15m') / 1000,
        message: mockScheduledMessage
      },
      {
        interval: '2-blocks',
        unit: 'blocks',
        value: 2,
        message: mockScheduledMessage
      }
    ]

    /**
     * blockRange of 5 blocks and 85 minutes
     *
     * Should produce 15 scheduled messages,
     * for a total of 17 including the actual messages
     */
    const sequencedMessagesStartTime = originTime + ms('35m')
    const blocksMeta = [
      // {
      //   height: originHeight + 10,
      //   timestamp: sequencedMessagesStartTime - ms('10m') - ms('10m') // 15m
      // },
      // {
      //   height: originHeight + 11,
      //   timestamp: sequencedMessagesStartTime - ms('10m') // 25m
      // },
      // The first sequenced message is on this block
      {
        height: originHeight + 12,
        timestamp: sequencedMessagesStartTime // 35m
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
        timestamp: sequencedMessagesStartTime + ms('16m') // 51m
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
        timestamp: sequencedMessagesStartTime + ms('16m') + ms('29m') // 80m
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
        timestamp: sequencedMessagesStartTime + ms('16m') + ms('29m') + ms('15m') // 95m
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
        timestamp: sequencedMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m') // 105m
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

    const scheduleMessagesBetween = scheduleMessagesBetweenWith({ processId, owner, originBlock, schedules, blocksMeta })

    const scheduledMessages = scheduleMessagesBetween(
      // left
      {
        block: {
          height: originHeight + 12,
          timestamp: sequencedMessagesStartTime
        },
        sortKey: padBlockHeight(`${originHeight + 12},${sequencedMessagesStartTime},hash-123`)
        // AoGlobal,
        // message
      },
      // right
      {
        block: {
          height: originHeight + 16,
          timestamp: sequencedMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')
        },
        sortKey: padBlockHeight(`${originHeight + 16},${sequencedMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')},hash-456`)
        // AoGlobal,
        // message
      }
    )

    test('should create scheduled message according to the schedules', async () => {
      console.log(countBy(prop('sortKey'), scheduledMessages))
      // Two actual messages + 15 scheduled messages between them
      assert.equal(scheduledMessages.length + 2, 17)
    })

    test('should create a unique pseudo-sortKey for each generated message', async () => {
      assert.equal(
        scheduledMessages.length,
        uniqBy(prop('sortKey'), scheduledMessages).length
      )
    })
  })

  describe('TODO loadMessages', () => {
    test('appends messages', async () => {

    })
  })
})
