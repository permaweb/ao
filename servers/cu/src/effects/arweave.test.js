import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { loadTransactionDataSchema, loadTransactionMetaSchema } from '../domain/dal.js'
import { loadTransactionDataWith, loadTransactionMetaWith } from './arweave.js'

const GRAPHQL_URL = globalThis.GRAPHQL_URL || 'https://arweave.net/graphql'
const ARWEAVE_URL = globalThis.ARWEAVE_URL || 'https://arweave.net'
const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'

describe('arweave', () => {
  describe('loadTransactionMetaWith', () => {
    test('load transaction meta', async () => {
      const loadTransactionMeta = loadTransactionMetaSchema.implement(
        loadTransactionMetaWith({
          fetch: (url, options) => {
            const body = JSON.parse(options.body)
            assert.deepStrictEqual(body.variables, {
              processIds: [PROCESS],
              skipTags: false,
              skipAnchor: false,
              skipSignature: false
            })

            return fetch(url, options)
          },
          GRAPHQL_URL
        })
      )
      const result = await loadTransactionMeta(PROCESS)
      assert.ok(result.tags)
      assert.ok(result.signature)
      assert.ok(result.owner.address)
      // eslint-disable-next-line no-prototype-builtins
      assert.ok(result.hasOwnProperty('anchor'))
      // eslint-disable-next-line no-prototype-builtins
      assert.ok(result.hasOwnProperty('recipient'))
    })

    test('pass the correct variables', async () => {
      const loadTransactionMeta = loadTransactionMetaSchema.implement(
        loadTransactionMetaWith({
          GRAPHQL_URL,
          fetch: async (url, options) => {
            assert.equal(url, GRAPHQL_URL)
            const body = JSON.parse(options.body)
            assert.deepStrictEqual(body.variables, {
              processIds: [PROCESS],
              skipTags: false,
              skipAnchor: false,
              skipSignature: true
            })

            return new Response(JSON.stringify({
              data: {
                transactions: {
                  edges: [
                    {
                      node: {
                        owner: { address: 'owner-123', key: 'key-123' },
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
        }))

      await loadTransactionMeta(PROCESS, { skipSignature: true })
    })
  })

  describe('loadTransactionDataWith', () => {
    test('load transaction data', async () => {
      const loadTransactionData = loadTransactionDataSchema.implement(
        loadTransactionDataWith({
          fetch: (url, options) => {
            assert.equal(url, `${ARWEAVE_URL}/raw/${PROCESS}`)
            return fetch(url, options)
          },
          ARWEAVE_URL
        })
      )
      const result = await loadTransactionData(PROCESS)
      assert.ok(result.arrayBuffer)
      assert.ok(result.json)
      assert.ok(result.text)
      assert.ok(result.ok)
    })

    test('load transaction data with query params', async () => {
      const loadTransactionData = loadTransactionDataSchema.implement(
        loadTransactionDataWith({
          fetch: (url, options) => {
            assert.equal(url, `${ARWEAVE_URL}/raw/${PROCESS}?foo=bar`)
            return fetch(url, options)
          },
          ARWEAVE_URL: `${ARWEAVE_URL}?foo=bar`
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
