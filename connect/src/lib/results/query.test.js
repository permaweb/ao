import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { queryWith } from './query.js'

describe('query', () => {
  test('should return the output', async () => {
    const query = queryWith({
      queryResults: async (args) => {
        assert.deepStrictEqual(args, {
          process: 'process-123',
          from: '1',
          to: '2',
          sort: 'DESC'
        })

        return {
          edges: [
            {
              node: {
                output: { data: 'foobar' },
                messages: [],
                spawns: []
              }
            }
          ]
        }
      }
    })

    const res = await query({
      process: 'process-123',
      from: '1',
      to: '2',
      sort: 'DESC'
    }).toPromise()

    assert.deepStrictEqual(res, {
      edges: [
        {
          node: {
            output: { data: 'foobar' },
            messages: [],
            spawns: []
          }
        }
      ]
    })
  })
})
