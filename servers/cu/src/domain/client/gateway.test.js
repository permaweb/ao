import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadBlocksMetaSchema, loadTransactionDataSchema, loadTransactionMetaSchema } from '../dal.js'
import { loadBlocksMetaWith, loadTransactionDataWith, loadTransactionMetaWith } from './gateway.js'
import { prop, uniqBy } from 'ramda'

const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'
const logger = createLogger('ao-cu:readState')

describe('gateway', () => {
  describe('loadTransactionMetaWith', () => {
    test('load transaction meta', async () => {
      const loadTransactionMeta = loadTransactionMetaSchema.implement(
        loadTransactionMetaWith({
          fetch,
          GATEWAY_URL
        })
      )
      const result = await loadTransactionMeta(PROCESS)
      assert.ok(result.tags)
    })

    test('pass the correct variables', async () => {
      const loadTransactionMeta = loadTransactionMetaSchema.implement(
        loadTransactionMetaWith({
          GATEWAY_URL,
          fetch: async (url, options) => {
            if (url.endsWith('/graphql')) {
              const body = JSON.parse(options.body)
              assert.deepStrictEqual(body.variables, { processIds: [PROCESS] })

              return new Response(JSON.stringify({
                data: {
                  transactions: {
                    edges: [
                      {
                        node: {
                          owner: { address: 'owner-123' },
                          tags: [
                            {
                              name: 'App-Name',
                              value: 'SmartWeaveContract'
                            },
                            {
                              name: 'App-Version',
                              value: '0.3.0'
                            },
                            {
                              name: 'Contract-Src',
                              value:
                              'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
                            },
                            {
                              name: 'SDK',
                              value: 'Warp'
                            },
                            {
                              name: 'Nonce',
                              value: '1693579974165'
                            },
                            {
                              name: 'Content-Type',
                              value: 'application/json'
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              }))
            }

            return new Response(JSON.stringify({ byteLength: 214390 }))
          }
        }))

      await loadTransactionMeta(PROCESS)
    })
  })

  describe('loadBlocksMeta', () => {
    test('load the block data across multiple pages', async () => {
      const loadBlocksMeta = loadBlocksMetaSchema.implement(loadBlocksMetaWith({ fetch, GATEWAY_URL, pageSize: 10, logger }))

      const res = await loadBlocksMeta({ min: 1276343, max: 1276343 + 50 })
      assert.equal(res.length, 51)
      assert.equal(res.length, uniqBy(prop('height'), res).length)
    })
  })

  describe('loadTransactionDataWith', () => {
    test('load transaction data', async () => {
      const loadTransactionData = loadTransactionDataSchema.implement(
        loadTransactionDataWith({
          fetch,
          GATEWAY_URL
        })
      )
      const result = await loadTransactionData(PROCESS)
      assert.ok(result.arrayBuffer)
      assert.ok(result.json)
      assert.ok(result.text)
      assert.ok(result.ok)
    })
  })
})
