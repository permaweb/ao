import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { loadInteractionsSchema } from '../dal.js'
import { createLogger } from '../logger.js'
import { loadInteractionsWith } from './warpSequencer.js'

const SEQUENCER_URL = 'https://gw.warp.cc'
const CONTRACT = 'SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY'
const logger = createLogger('ao-cu:readState')

describe('warp-sequencer', () => {
  describe('loadInteractions', () => {
    test('load the interactions from the sequencer', async () => {
      const loadInteractions = loadInteractionsSchema.implement(
        loadInteractionsWith({
          fetch,
          SEQUENCER_URL,
          logger: logger.child('readState:sequencer'),
          pageSize: 2500
        })
      )

      const res = await loadInteractions({
        id: CONTRACT,
        owner: 'owner-123',
        from: '',
        to: ''
      })
      assert.ok(res.length)
      const [firstInteraction] = res
      assert.ok(firstInteraction.action)
      assert.ok(firstInteraction.action.input.function)
      assert.ok(firstInteraction.action.caller)
      assert.ok(firstInteraction.sortKey)
      assert.ok(firstInteraction.SWGlobal)
      // attach contract meta to SWGlobal
      assert.equal(firstInteraction.SWGlobal.contract.id, CONTRACT)
      assert.equal(firstInteraction.SWGlobal.contract.owner, 'owner-123')
    })
  })
})
