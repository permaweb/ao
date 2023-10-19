/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { SCHEDULED_INTERVAL, SCHEDULED_MESSAGE, parseSchedules } from './loadMessages.js'

describe('loadMessages', () => {
  describe('parseSchedules', () => {
    test('parses the schedules from the tags', async () => {
      const [action1, action2, action3] = [
        JSON.stringify([
          { name: 'function', value: 'notify' },
          { name: 'notify-function', value: 'transfer' },
          { name: 'from', value: 'SIGNERS_WALLET_ADDRESS' },
          { name: 'qty', value: '1000' }
        ]),
        JSON.stringify([
          { name: 'function', value: 'notify' },
          { name: 'notify-function', value: 'transfer' }
        ]),
        JSON.stringify([
          { name: 'function', value: 'transfer' },
          { name: 'qty', value: '1000' }
        ])
      ]

      /**
       * Purposefully mixed up to test robustness of parsing queue
       */
      const tags = [
        { name: 'Foo', value: 'Bar' },
        { name: SCHEDULED_INTERVAL, value: '10_blocks' },
        { name: SCHEDULED_INTERVAL, value: ' 10_minutes ' },
        {
          name: SCHEDULED_MESSAGE,
          value: action1
        },
        { name: 'Random', value: 'Tag' },
        {
          name: SCHEDULED_MESSAGE,
          value: action2
        },
        { name: SCHEDULED_INTERVAL, value: '* 1 * * *_cron' },
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
        message: JSON.parse(action1),
        interval: '10_blocks'
      })

      assert.deepStrictEqual(staticTime, {
        value: 600,
        unit: 'seconds',
        message: JSON.parse(action2),
        interval: ' 10_minutes '
      })

      assert.deepStrictEqual(cron, {
        value: '* 1 * * *',
        unit: 'cron',
        message: JSON.parse(action3),
        interval: '* 1 * * *_cron'
      })
    })
  })

  describe('TODO scheduleMessagesBetween', () => {
    test('should create scheduled message according to the schedules', async () => {

    })
  })

  describe('TODO loadMessages', () => {
    test('appends messages', async () => {

    })
  })
})
