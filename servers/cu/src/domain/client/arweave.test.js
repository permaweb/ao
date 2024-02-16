import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { loadTransactionDataSchema, loadTransactionMetaSchema } from '../dal.js'
import { loadTransactionDataWith, loadTransactionMetaWith } from './arweave.js'

const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'

describe('arweave', () => {
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

  describe('loadTransactionDataWith', () => {
    test('load transaction data', async () => {
      const loadTransactionData = loadTransactionDataSchema.implement(
        loadTransactionDataWith({
          fetch: (url, options) => {
            assert.equal(url, `${GATEWAY_URL}/raw/${PROCESS}`)
            return fetch(url, options)
          },
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

  describe.todo('buildAndSignDataItemWith')
  describe.todo('queryGatewayWith')
  describe.todo('uploadDataItemWith')
})
