import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadStateSchema } from '../dal.js'
import { loadStateWith } from './ao-cu.js'

const logger = createLogger('ao-cu')

describe('ao-cu', () => {
  describe('loadStateWith', () => {
    test('fetches the state from the CU and passes it through', async () => {
      const loadState = loadStateSchema.implement(
        loadStateWith({
          CU_URL: 'https://foo.bar',
          fetch: async (url, options) => {
            assert.equal(url, 'https://foo.bar/state/process-123?to=sort-key-123')
            assert.deepStrictEqual(options, {
              method: 'GET',
              headers: {
                Accept: 'application/json'
              }
            })

            return new Response(JSON.stringify({
              state: { foo: 'bar' },
              result: {}
            }))
          },
          logger
        })
      )

      await loadState({ id: 'process-123', sortKey: 'sort-key-123' })
        .then(res => assert.deepStrictEqual(res, {
          state: { foo: 'bar' },
          result: {}
        }))
    })

    test('omit params if no sortKey is provided', async () => {
      const loadState = loadStateSchema.implement(
        loadStateWith({
          CU_URL: 'https://foo.bar',
          fetch: async (url, options) => {
            assert.equal(url, 'https://foo.bar/state/process-123')
            return new Response(JSON.stringify({
              state: { foo: 'bar' },
              result: {}
            }))
          },
          logger
        })
      )

      await loadState({ id: 'process-123' })
    })
  })
})
