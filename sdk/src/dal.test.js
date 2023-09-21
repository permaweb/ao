import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { loadTransactionDataWith, loadTransactionMetaWith } from './dal.js'

const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const CONTRACT = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'

describe('dal', () => {
  describe('loadTransactionMetaWith', () => {
    test('load transaction meta', async () => {
      const loadTransactionMeta = loadTransactionMetaWith({
        fetch,
        GATEWAY_URL
      })
      const result = await loadTransactionMeta(CONTRACT).toPromise()
      assert.ok(result.tags)
    })

    test('pass the correct variables', async () => {
      const loadTransactionMeta = loadTransactionMetaWith({
        GATEWAY_URL,
        fetch: async (url, options) => {
          if (url.endsWith('/graphql')) {
            const body = JSON.parse(options.body)
            assert.deepStrictEqual(body.variables, { contractIds: [CONTRACT] })

            return new Response(JSON.stringify({
              data: {
                transactions: {
                  edges: [
                    {
                      node: {
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
      })

      await loadTransactionMeta(CONTRACT).toPromise()
    })
  })

  describe('loadTransactionDataWith', () => {
    test('load transaction data', async () => {
      const loadTransactionData = loadTransactionDataWith({
        fetch,
        GATEWAY_URL
      })
      const result = await loadTransactionData(CONTRACT).toPromise()
      assert.ok(result.arrayBuffer)
      assert.ok(result.json)
      assert.ok(result.text)
      assert.ok(result.ok)
    })
  })
})
