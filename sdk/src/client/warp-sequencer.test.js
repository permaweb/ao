import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadInteractionsWith } from './warp-sequencer.js'

const SEQUENCER_URL = 'https://gw.warp.cc'
const CONTRACT = 'SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY'
const logger = createLogger('@permaweb/ao-sdk:readState')

describe('warp-sequencer', () => {
  describe('loadInteractions', () => {
    test('load the interactions from the sequencer', async () => {
      const loadInteractions = loadInteractionsWith({
        fetch,
        SEQUENCER_URL,
        logger: logger.child('readState:sequencer'),
        pageSize: 2500
      })

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
      assert.ok(firstInteraction.sortKey)
      assert.ok(firstInteraction.SWGlobal)
      // attach contract meta to SWGlobal
      assert.equal(firstInteraction.SWGlobal.contract.id, CONTRACT)
      assert.equal(firstInteraction.SWGlobal.contract.owner, 'owner-123')
    })
  })
})
