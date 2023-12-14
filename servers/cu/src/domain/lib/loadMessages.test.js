/* eslint-disable no-throw-literal */
import { describe, test, before } from 'node:test'
import * as assert from 'node:assert'

import ms from 'ms'
import { countBy, prop, uniqBy } from 'ramda'

import { padBlockHeight } from '../utils.js'

import { CRON_INTERVAL, parseCrons, isBlockOnCron, isTimestampOnCron, cronMessagesBetweenWith } from './loadMessages.js'

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
     */
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

    /**
     * blockRange of 5 blocks and 85 minutes
     *
     * Should produce 15 cron messages,
     * for a total of 17 including the actual messages
     */
    const scheduledMessagesStartTime = originTime + ms('35m')
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
        timestamp: scheduledMessagesStartTime // 35m
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
        timestamp: scheduledMessagesStartTime + ms('16m') // 51m
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
        timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') // 80m
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
        timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') // 95m
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
        timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m') // 105m
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

    const cronMessagesBetween = cronMessagesBetweenWith({ processId, owner, originBlock, crons, blocksMeta })

    const genCronMessages = cronMessagesBetween(
      // left
      {
        block: {
          height: originHeight + 12,
          timestamp: scheduledMessagesStartTime
        },
        sortKey: padBlockHeight(`${originHeight + 12},${scheduledMessagesStartTime},hash-123`)
        // AoGlobal,
        // message
      },
      // right
      {
        block: {
          height: originHeight + 16,
          timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')
        },
        sortKey: padBlockHeight(`${originHeight + 16},${scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')},hash-456`)
        // AoGlobal,
        // message
      }
    )

    const cronMessages = []
    before(async () => {
      for await (const cron of genCronMessages) cronMessages.push(cron)
    })

    test('should create cron message according to the crons', async () => {
      console.log(countBy(prop('sortKey'), cronMessages))
      // Two actual messages + 15 cron messages between them
      assert.equal(cronMessages.length + 2, 17)
    })

    test('should create a unique pseudo-sortKey for each generated message', async () => {
      assert.equal(
        cronMessages.length,
        uniqBy(prop('sortKey'), cronMessages).length
      )
    })
  })

  describe.todo('loadMessages', () => {})
})
