import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { messageWith } from './index.js'

const logger = createLogger('message')

function createMessage (deployMessage) {
  return messageWith({ deployMessage, logger })
}

describe('message', () => {
  test('returns the message id by default', async () => {
    const message = createMessage(async ({ returnMessageId }) => {
      assert.equal(returnMessageId, undefined)
      return { messageId: 'data-item-123', assignmentSlot: '42' }
    })

    const res = await message({
      process: 'process-asdf',
      signer: () => {}
    })

    assert.equal(res, 'data-item-123')
  })

  test('returns the assignment slot when returnAssignmentSlot is true', async () => {
    const message = createMessage(async ({ returnAssignmentSlot }) => {
      assert.equal(returnAssignmentSlot, true)
      return { messageId: 'data-item-123', assignmentSlot: '42' }
    })

    const res = await message({
      process: 'process-asdf',
      signer: () => {},
      returnAssignmentSlot: true
    })

    assert.equal(res, '42')
  })

  test('returns slot and id when returnAssignmentSlot and returnMessageId are true', async () => {
    const message = createMessage(async ({ returnAssignmentSlot, returnMessageId }) => {
      assert.equal(returnAssignmentSlot, true)
      assert.equal(returnMessageId, true)
      return { messageId: 'data-item-123', assignmentSlot: '42' }
    })

    const res = await message({
      process: 'process-asdf',
      signer: () => {},
      returnAssignmentSlot: true,
      returnMessageId: true
    })

    assert.deepStrictEqual(res, {
      slot: '42',
      id: 'data-item-123'
    })
  })
})
