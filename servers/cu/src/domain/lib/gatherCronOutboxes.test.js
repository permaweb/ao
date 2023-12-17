/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { gatherCronOutboxesWith } from './gatherCronOutboxes.js'

describe('gatherCronOutboxesWith', () => {
  test('should filter down to only the cron outboxes, and append to ctx', async () => {
    const mockEval = {
      processId: 'process-123',
      messageId: 'message-123',
      timestamp: new Date().getTime(),
      evaluatedAt: new Date()
    }
    const gatherCronOutboxes = gatherCronOutboxesWith({
      findEvaluations: async ({ processId, from, to }) => {
        assert.equal(processId, 'process-123')
        assert.equal(from, 'block-122,time-456,hash-789')
        assert.equal(to, 'block-124,time-456,hash-789')

        return [
          {
            isCron: true,
            ...mockEval,
            output: { Messages: [{ foo: '1' }, { fizz: '2' }], Spawns: [{ foo: '3' }] }
          },
          // Cron message, but no output.result.messages
          {
            isCron: true,
            ...mockEval,
            output: {}
          },
          // Not a cron message
          {
            isCron: false,
            ...mockEval,
            output: { Messages: [{ foo: '3' }, { fizz: '4' }] }
          },
          {
            isCron: true,
            ...mockEval,
            output: { Messages: [{ foo: '5' }] }
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

    assert.equal(res.outboxes.length, 3)
    const [one, two, three] = res.outboxes
    assert.equal(one.Messages.length, 2)
    assert.equal(one.Spawns.length, 1)
    assert.equal(two.Messages.length, 0)
    assert.equal(three.Messages.length, 1)
  })
})
