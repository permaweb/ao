import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { interactionSchema } from '../../model.js'
import { createLogger } from '../../logger.js'
import { loadActionsWith } from './load-actions.js'

const CONTRACT = 'SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY'
const logger = createLogger('ao-cu:readState')

const SWGlobal = {
  contract: {
    id: 'ct-123',
    owner: 'owner-123'
  },
  transaction: {
    id: 'tx-123',
    owner: 'owner-123',
    target: 'target-123',
    quantity: 123,
    reward: 123,
    tags: [
      { name: 'foo', value: 'bar' }
    ]
  },
  block: {
    height: 123,
    indep_hash: 'hash-123',
    timestamp: new Date().getTime()
  }
}

describe('load-actions', () => {
  test('return actions in correct shape', async () => {
    const loadActions = loadActionsWith({
      loadInteractions: async ({ id, from, to }) => ([
        {
          action: { input: { function: 'createOrder' }, caller: 'caller-123' },
          sortKey: 'abcd,123,fsdf',
          SWGlobal
        },
        {
          action: { input: { function: 'createOrder' }, caller: 'caller-456' },
          sortKey: 'fdsa,456,cdskjfs',
          SWGlobal
        }
      ]),
      logger
    })
    const result = await loadActions({ id: CONTRACT, owner: 'owner-123' }).toPromise()
    assert.ok(result.actions)
    assert.ok(result.id)

    const [firstInteraction] = result.actions
    assert.ok(interactionSchema.safeParse(firstInteraction).success)
  })

  test('throw if actions are not in expected shape', async () => {
    const loadActionsNoAction = loadActionsWith({
      loadInteractions: async ({ id, from, to }) => ([
        {
          not_action: { input: { function: 'createOrder' } },
          sortKey: 'abcd,123,fsdf'
        }
      ]),
      logger
    })
    await loadActionsNoAction({ id: CONTRACT, owner: 'owner-123' }).toPromise()
      .then(() => assert('unreachable. Should have thrown'))
      .catch(assert.ok)

    const loadActionsNoSortKey = loadActionsWith({
      loadInteractions: async ({ id, from, to }) => ([
        {
          action: { input: { function: 'createOrder' }, caller: 'caller-123' },
          noSortKey: 'abcd,123,fsdf'
        }
      ]),
      logger
    })
    await loadActionsNoSortKey({ id: CONTRACT, owner: 'owner-123' }).toPromise()
      .then(() => assert('unreachable. Should have thrown'))
      .catch(assert.ok)
  })
})
