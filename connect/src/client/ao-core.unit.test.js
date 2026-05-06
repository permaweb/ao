import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { messageWith } from './ao-core.js'

function responseWith (body, headers = {}) {
  return {
    ok: true,
    headers: {
      get: (name) => headers[name] ?? headers[name.toLowerCase()] ?? null
    },
    json: async () => body
  }
}

function createMessage (body, headers) {
  return messageWith({
    aoCore: {
      request: async () => responseWith(body, headers)
    }
  })
}

describe('ao-core message', () => {
  test('returns the assignment slot by default', async () => {
    const message = createMessage({ slot: 42, id: 'message-123' })

    const res = await message({ process: 'process-asdf' })

    assert.equal(res, 42)
  })

  test('returns the message id when returnMessageId is true', async () => {
    const message = createMessage({ slot: 42, id: 'message-123' })

    const res = await message({
      process: 'process-asdf',
      returnMessageId: true
    })

    assert.equal(res, 'message-123')
  })

  test('returns slot and id when returnAssignmentSlot and returnMessageId are true', async () => {
    const message = createMessage({ slot: 42, id: 'message-123' })

    const res = await message({
      process: 'process-asdf',
      returnAssignmentSlot: true,
      returnMessageId: true
    })

    assert.deepStrictEqual(res, {
      slot: 42,
      id: 'message-123'
    })
  })
})
