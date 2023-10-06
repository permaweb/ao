import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { readWith } from './read.js'

describe('read', () => {
  test('should return the output', async () => {
    const read = readWith({
      loadState: async (args) => {
        assert.deepStrictEqual(args, {
          id: 'contract-123',
          sortKey: 'sort-key-123'
        })

        return { state: { foo: 'bar' }, messages: [{ foo: 'bar' }] }
      }
    })

    const res = await read({
      id: 'contract-123',
      sortKey: 'sort-key-123'
    }).toPromise()

    assert.deepStrictEqual(res, {
      state: { foo: 'bar' }, messages: [{ foo: 'bar' }]
    })
  })
})
