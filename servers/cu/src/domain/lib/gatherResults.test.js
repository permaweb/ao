/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { gatherResultsWith } from './gatherResults.js'
import { evaluationToCursor, maybeBase64Object } from '../utils.js'

describe('gatherResultsWith', () => {
  const mockEval = {
    processId: 'process-123',
    messageId: 'message-123',
    timestamp: new Date().getTime(),
    ordinate: '3',
    blockHeight: 1234,
    evaluatedAt: new Date()
  }
  const mockRes = [
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
    },
    {
      cron: undefined,
      ...mockEval,
      output: { Error: 'foobar', Messages: [{ foo: '6' }] }
    }
  ]

  test('should filter down to only the cron results, create cursors, and append to ctx', async () => {
    const FROM = 1702841577654
    const TO = 1702841577754

    const gatherResults = gatherResultsWith({
      findEvaluations: async ({ processId, from, to, sort, limit, onlyCron }) => {
        assert.equal(processId, 'process-123')
        assert.equal(limit, 20)
        assert.equal(sort, 'ASC')
        assert.ok(onlyCron)
        assert.deepStrictEqual(from, { timestamp: FROM })
        assert.deepStrictEqual(to, { timestamp: TO })

        return mockRes
      }
    })

    const onlyCron = await gatherResults({
      processId: 'process-123',
      from: FROM,
      to: TO,
      sort: 'ASC',
      limit: 20,
      onlyCron: true
    }).toPromise()

    assert.equal(onlyCron.processId, 'process-123')
    assert.equal(onlyCron.from, FROM)
    assert.equal(onlyCron.to, TO)
    assert(onlyCron.evaluations)

    assert.equal(onlyCron.evaluations.length, 3)
    const [one, two, three] = onlyCron.evaluations
    assert.ok(one.cursor)
    assert.equal(one.output.Messages.length, 2)
    assert.equal(one.output.Spawns.length, 1)
    assert.ok(two.cursor)
    assert.equal(two.output.Messages.length, 0)
    assert.ok(three.cursor)
    assert.equal(three.output.Messages.length, 1)

    // Confirm criteria properly serialized into the cursor
    const parsed = await maybeBase64Object(one.cursor).toPromise()
    assert.deepStrictEqual(parsed, {
      timestamp: mockEval.timestamp,
      ordinate: mockEval.ordinate,
      cron: '1-10-minutes',
      sort: 'ASC'
    })
  })

  test('should return all evaluations, create cursors, and append to ctx', async () => {
    const FROM = 1702841577654
    const TO = 1702841577754

    const gatherResults = gatherResultsWith({
      findEvaluations: async ({ onlyCron }) => {
        assert.equal(onlyCron, false)

        return mockRes
      }
    })

    const all = await gatherResults({
      processId: 'process-123',
      from: FROM,
      to: TO,
      sort: 'ASC',
      limit: 20
    }).toPromise()

    assert.equal(all.evaluations.length, 4)
  })

  test('should parse the criteria from the cursors and use to find evaluations', async () => {
    const mockEval = {
      processId: 'process-123',
      messageId: 'message-123',
      timestamp: new Date().getTime(),
      ordinate: 3,
      blockHeight: 1234,
      evaluatedAt: new Date()
    }

    // DESC here should be used for sort
    const FROM = evaluationToCursor({ ...mockEval, timestamp: 1702841577654, cron: '1-10-minutes' }, 'DESC')
    const TO = evaluationToCursor({ ...mockEval, timestamp: 1702841577754, cron: '1-15-minutes' }, 'ASC')

    const gatherCronResults = gatherResultsWith({
      findEvaluations: async ({ processId, from, to, sort, limit, onlyCron }) => {
        assert.equal(processId, 'process-123')
        assert.equal(limit, 13)
        assert.equal(sort, 'DESC')
        assert.equal(onlyCron, false)

        assert.deepStrictEqual(from, {
          timestamp: 1702841577654,
          ordinate: '3',
          cron: '1-10-minutes'
        })

        assert.deepStrictEqual(to, {
          timestamp: 1702841577754,
          ordinate: '3',
          cron: '1-15-minutes'
        })

        return []
      }
    })

    await gatherCronResults({
      processId: 'process-123',
      from: FROM,
      to: TO,
      limit: 13
    }).toPromise()
  })
})
