import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { loadTransactionMetaSchema } from '../dal.js'
import { loadTransactionMetaWith } from './gateway.js'

const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'

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
              assert.deepStrictEqual(body.variables, { transactionIds: [PROCESS] })

              return new Response(JSON.stringify({
                data: {
                  transactions: {
                    edges: [
                      {
                        node: {
                          tags: [
                            {
                              name: 'Contract-Src',
                              value: 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
                            },
                            {
                              name: 'SDK',
                              value: 'ao'
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
})
