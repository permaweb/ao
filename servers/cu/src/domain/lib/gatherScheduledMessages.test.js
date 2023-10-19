/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { gatherScheduledMessagesWith } from './gatherScheduledMessages.js'

describe('gatherScheduledMessages', () => {
  test('should filter down to only the scheduled messages and append to ctx', async () => {
    const scheduledSortKey = 'block-123,time-456,hash-789,10_blocks1'
    const notScheduledSortKey = 'block-123,time-456,hash-789'

    const mockEval = {
      processId: 'process-123',
      message: { target: 'process-456', owner: 'owner-123', tags: [] },
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
            output: { state: { foo: 'bar' }, result: { messages: [{ foo: '1' }, { fizz: '2' }] } }
          },
          // Scheduled message, but no output.result.messages
          {
            sortKey: scheduledSortKey,
            ...mockEval,
            output: { state: { foo: 'bar' } }
          },
          // Not a scheduled message
          {
            sortKey: notScheduledSortKey,
            ...mockEval,
            output: { state: { foo: 'bar' }, result: { messages: [{ foo: '3' }, { fizz: '4' }] } }
          },
          {
            ...mockEval,
            sortKey: scheduledSortKey,
            output: { state: { foo: 'bar' }, result: { messages: [{ foo: '5' }] } }
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
    assert.equal(one.foo, '1')
    assert.equal(two.fizz, '2')
    assert.equal(five.foo, '5')
  })
})
