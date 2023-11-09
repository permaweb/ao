/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { gatherScheduledMessagesWith } from './gatherScheduledMessages.js'

describe('gatherScheduledMessages', () => {
  test('should filter down to only the scheduled outbox messages, attach the scheduledSortKey to each outbox message, and append to ctx', async () => {
    const scheduledSortKey = 'block-123,time-456,hash-789,idx1-10-blocks'
    const notScheduledSortKey = 'block-123,time-456,hash-789'

    const mockEval = {
      processId: 'process-123',
      evaluatedAt: new Date()
    }
    const gatherScheduledMessages = gatherScheduledMessagesWith({
      findEvaluations: async ({ processId, from, to }) => {
        assert.equal(processId, 'process-123')
        assert.equal(from, 'block-122,time-456,hash-789')
        assert.equal(to, 'block-124,time-456,hash-789')

        return [
          {
            ...mockEval,
            sortKey: scheduledSortKey,
            output: { messages: [{ foo: '1' }, { fizz: '2' }] }
          },
          // Scheduled message, but no output.result.messages
          {
            sortKey: scheduledSortKey,
            ...mockEval,
            output: {}
          },
          // Not a scheduled message
          {
            sortKey: notScheduledSortKey,
            ...mockEval,
            output: { messages: [{ foo: '3' }, { fizz: '4' }] }
          },
          {
            ...mockEval,
            sortKey: scheduledSortKey,
            output: { messages: [{ foo: '5' }] }
          }
        ]
      }
    })

    const res = await gatherScheduledMessages({
      processId: 'process-123',
      from: 'block-122,time-456,hash-789',
      to: 'block-124,time-456,hash-789'
    }).toPromise()

    assert.equal(res.processId, 'process-123')
    assert.equal(res.from, 'block-122,time-456,hash-789')
    assert.equal(res.to, 'block-124,time-456,hash-789')
    assert(res.messages)
    assert.equal(res.messages.length, 3)
    const [one, two, five] = res.messages
    assert.equal(one.scheduledSortKey, scheduledSortKey)
    assert.equal(one.foo, '1')
    assert.equal(two.scheduledSortKey, scheduledSortKey)
    assert.equal(two.fizz, '2')
    assert.equal(five.foo, '5')
    assert.equal(five.scheduledSortKey, scheduledSortKey)
  })
})
