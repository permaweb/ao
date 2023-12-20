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
      blockHeight: 1234,
      evaluatedAt: new Date()
    }
    const FROM = 1702841577654
    const TO = 1702841577754

    const gatherCronOutboxes = gatherCronOutboxesWith({
      findEvaluations: async ({ processId, from, to }) => {
        assert.equal(processId, 'process-123')
        assert.equal(from, FROM)
        assert.equal(to, TO)

        return [
          {
            cron: '1-10-minutes',
            ...mockEval,
            output: { Messages: [{ foo: '1' }, { fizz: '2' }], Spawns: [{ foo: '3' }] }
          },
          // Cron message, but no output.result.messages
          {
            cron: '1-10-minutes',
            ...mockEval,
            output: {}
          },
          // Not a cron message
          {
            cron: undefined,
            ...mockEval,
            output: { Messages: [{ foo: '3' }, { fizz: '4' }] }
          },
          {
            cron: '1-10-minutes',
            ...mockEval,
            output: { Messages: [{ foo: '5' }] }
          }
        ]
      }
    })

    const res = await gatherCronOutboxes({
      processId: 'process-123',
      from: FROM,
      to: TO
    }).toPromise()

    assert.equal(res.processId, 'process-123')
    assert.equal(res.from, FROM)
    assert.equal(res.to, TO)
    assert(res.evaluations)

    assert.equal(res.evaluations.length, 3)
    const [one, two, three] = res.evaluations
    assert.ok(one.timestamp)
    assert.equal(one.output.Messages.length, 2)
    assert.equal(one.output.Spawns.length, 1)
    assert.ok(two.timestamp)
    assert.equal(two.output.Messages.length, 0)
    assert.ok(three.timestamp)
    assert.equal(three.output.Messages.length, 1)
  })
})
