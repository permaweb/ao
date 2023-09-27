import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { readWith } from './read.js'
import { Resolved } from 'hyper-async'

describe('read', () => {
  test('should return the loaded state', async () => {
    const read = readWith({
      loadState: (args) => {
        assert.deepStrictEqual(args, {
          id: 'contract-123',
          sortKey: 'sort-key-123'
        })

        return Resolved({ state: { foo: 'bar' } })
      }
    })

    await read({
      id: 'contract-123',
      sortKey: 'sort-key-123'
    }).toPromise()
  })

  test('should return undefined if no state', async () => {
    const read = readWith({
      loadState: (args) => Resolved({ no_state: { foo: 'bar' } })
    })

    await read({
      id: 'contract-123',
      sortKey: 'sort-key-123'
    }).toPromise()
      .then(state => assert.ok(state === undefined))
  })

  test('should return undefined if no value', async () => {
    const read = readWith({
      loadState: (args) => Resolved(undefined)
    })

    await read({
      id: 'contract-123',
      sortKey: 'sort-key-123'
    }).toPromise()
      .then(state => assert.ok(state === undefined))
  })
})
