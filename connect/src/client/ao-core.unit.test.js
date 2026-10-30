import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { messageWith, rngWith } from './ao-core.js'

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

describe('ao-core rng', () => {
  test('maps BLS verification to rng@1.0', async () => {
    let request
    const rng = rngWith({
      aoCore: {
        request: async (args) => {
          request = args
          return responseWith({ valid: true })
        }
      }
    })

    await rng.verifyRound({
      publicKey: 'a'.repeat(96),
      beacon: 'b'.repeat(43),
      round: 1,
      signature: 'c'.repeat(192)
    })

    assert.deepStrictEqual(request, {
      path: '~rng@1.0/verify-bls',
      accept: 'application/json',
      'public-key': 'a'.repeat(96),
      message: `hyperbeam/rng/v1|${'b'.repeat(43)}|1`,
      signature: 'c'.repeat(192)
    })
  })

  test('maps byte derivation to rng@1.0', async () => {
    let request
    const rng = rngWith({
      aoCore: {
        request: async (args) => {
          request = args
          return responseWith({ valid: true })
        }
      }
    })

    await rng.derive({ seed: 'seed', counter: 7, bytes: 32 })

    assert.deepStrictEqual(request, {
      path: '~rng@1.0/derive',
      accept: 'application/json',
      seed: 'seed',
      counter: 7,
      bytes: 32
    })
  })

  test('rejects malformed protocol inputs before sending', () => {
    let called = false
    const rng = rngWith({
      aoCore: { request: async () => { called = true } }
    })

    assert.throws(() => rng.verifyRound({
      publicKey: 'bad', beacon: 'bad', round: 0, signature: 'bad'
    }))
    assert.throws(() => rng.derive({ seed: 'seed', counter: -1, bytes: 32 }))
    assert.equal(called, false)
  })
})
