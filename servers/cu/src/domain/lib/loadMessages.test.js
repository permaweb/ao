/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import ms from 'ms'

import { CRON_INTERVAL, parseCrons, isBlockOnCron, isTimestampOnCron, mergeBlocks } from './loadMessages.js'
// import { createLogger } from '../logger.js'

// const logger = createLogger('ao-cu:loadMessages')
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

  describe('loadCronMessages', async () => {
    // const deps = {
    //   loadTimestamp: async ({ suUrl, processId }) => ({ height: 1, timestamp: 2 }),
    //   findBlocks: () => null,
    //   loadBlocksMeta: () => null,
    //   saveBlocks: () => null,
    //   logger,
    //   genCronMessages: () => null
    // }
    // const tags = [
    //   { name: 'Foo', value: 'Bar' },
    //   { name: 'Random', value: 'Tag' },
    //   { name: 'Another', value: 'Tag' },
    //   { name: CRON_INTERVAL, value: '10-blocks' },
    //   { name: 'Cron-Tag-function', value: 'notify' },
    //   { name: 'Cron-Tag-notify-function', value: 'transfer' },
    //   { name: CRON_INTERVAL, value: ' 10-minutes ' },
    //   { name: 'Cron-Tag-function', value: 'notify' },
    //   { name: 'Cron-Tag-notify-function', value: 'transfer' },
    //   { name: CRON_INTERVAL, value: '1-hour' },
    //   { name: 'Cron-Tag-Function', value: 'transfer' }
    // ]

    // const scheduledMessages = [{ name: 'message1' }, { name: 'message2' }]

    // test('return scheduled messages if no crons', async () => {
    //   const loadCronMessages = loadCronMessagesWith(deps)
    //   const res = await loadCronMessages({ tags, $scheduled: scheduledMessages, id: 'process-123', suUrl: 'https://www.example.com/' }).toPromise()
    //   // assert.deepStrictEqual(res, scheduledMessages)
    //   console.log({ duplex: res.messages })
    // })
  })
})
