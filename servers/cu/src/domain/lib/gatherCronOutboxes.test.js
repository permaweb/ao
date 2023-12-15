/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { gatherCronOutboxesWith } from './gatherCronOutboxes.js'

describe('gatherCronOutboxesWith', () => {
  test('should filter down to only the cron outboxes, and append to ctx', async () => {
    const cronSortKey = 'block-123,time-456,hash-789,idx1-10-blocks'
    const notCronSortKey = 'block-123,time-456,hash-789'

    const mockEval = {
      processId: 'process-123',
      evaluatedAt: new Date()
    }
    const gatherCronOutboxes = gatherCronOutboxesWith({
      findEvaluations: async ({ processId, from, to }) => {
        assert.equal(processId, 'process-123')
        assert.equal(from, 'block-122,time-456,hash-789')
        assert.equal(to, 'block-124,time-456,hash-789')

        return [
          {
            ...mockEval,
            sortKey: cronSortKey,
            output: { messages: [{ foo: '1' }, { fizz: '2' }], spawns: [{ foo: '3' }] }
          },
          // Cron message, but no output.result.messages
          {
            sortKey: cronSortKey,
            ...mockEval,
            output: {}
          },
          // Not a cron message
          {
            sortKey: notCronSortKey,
            ...mockEval,
            output: { messages: [{ foo: '3' }, { fizz: '4' }] }
          },
          {
            ...mockEval,
            sortKey: cronSortKey,
            output: { messages: [{ foo: '5' }] }
          }
        ]
      }
    })

    const res = await gatherCronOutboxes({
      processId: 'process-123',
      from: 'block-122,time-456,hash-789',
      to: 'block-124,time-456,hash-789'
    }).toPromise()

    assert.equal(res.processId, 'process-123')
    assert.equal(res.from, 'block-122,time-456,hash-789')
    assert.equal(res.to, 'block-124,time-456,hash-789')
    assert(res.outboxes)

    console.log(res.outboxes)
    assert.equal(res.outboxes.length, 3)
    const [one, two, three] = res.outboxes
    assert.equal(one.messages.length, 2)
    assert.equal(one.spawns.length, 1)
    assert.equal(two.messages.length, 0)
    assert.equal(three.messages.length, 1)
  })
})
