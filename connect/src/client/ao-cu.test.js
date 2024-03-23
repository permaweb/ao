import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadResultSchema, queryResultsSchema, dryrunResultSchema } from '../dal.js'
import { loadResultWith, queryResultsWith, dryrunFetchWith } from './ao-cu.js'

const logger = createLogger('ao-cu')

describe('ao-cu', () => {
  describe('dryrun', () => {
    test('posts to dry run endpoint', async () => {
      const dryrunResult = dryrunResultSchema.implement(
        dryrunFetchWith({
          CU_URL: 'https://foo.bar',
          fetch: async (url, options) => {
            assert.equal(url, 'https://foo.bar/dry-run?process-id=FOO_PROCESS')
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              redirect: 'follow',
              body: JSON.stringify({
                Id: '1234',
                Target: 'FOO_PROCESS',
                Owner: 'FOO_OWNER',
                Data: 'SOME DATA',
                Tags: [
                  { name: 'Action', value: 'Balance' },
                  { name: 'Target', value: 'MY_WALLET' },
                  { name: 'Data-Protocol', value: 'ao' },
                  { name: 'Type', value: 'Message' },
                  { name: 'Variant', value: 'ao.TN.1' }
                ]
              })
            })

            return new Response(JSON.stringify({
              Output: 'Success',
              Messages: [],
              Spawns: []
            }))
          },
          logger
        }))

      const res = await dryrunResult({
        Id: '1234',
        Target: 'FOO_PROCESS',
        Owner: 'FOO_OWNER',
        Data: 'SOME DATA',
        Tags: [
          { name: 'Action', value: 'Balance' },
          { name: 'Target', value: 'MY_WALLET' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Message' },
          { name: 'Variant', value: 'ao.TN.1' }
        ]
      })
      assert.deepEqual(res, { Output: 'Success', Messages: [], Spawns: [] })
    })
  })

  describe('queryResultsWith', () => {
    test('queries the results for a process', async () => {
      const queryResult = queryResultsSchema.implement(
        queryResultsWith({
          CU_URL: 'https://foo.bar',
          fetch: async (url, options) => {
            assert.equal(url, 'https://foo.bar/results/process-123?sort=ASC')
            assert.deepStrictEqual(options, {
              method: 'GET',
              headers: {
                Accept: 'application/json'
              },
              redirect: 'follow'
            })

            return new Response(JSON.stringify({
              edges: [
                {
                  cursor: '2',
                  node: {
                    Output: { data: 'foobar' },
                    Messages: [],
                    Spawns: []
                  }
                }
              ]
            }))
          },
          logger
        })
      )
      await queryResult({ process: 'process-123' })
        .then(res => assert.deepStrictEqual(res, {
          edges: [
            {
              cursor: '2',
              node: {
                Output: { data: 'foobar' },
                Messages: [],
                Spawns: []
              }
            }
          ]
        }))
    })
  })

  describe('loadResultWith', () => {
    test('fetches the state from the CU and passes it through', async () => {
      const loadResult = loadResultSchema.implement(
        loadResultWith({
          CU_URL: 'https://foo.bar',
          fetch: async (url, options) => {
            assert.equal(url, 'https://foo.bar/result/message-123?process-id=process-123')
            assert.deepStrictEqual(options, {
              method: 'GET',
              headers: {
                Accept: 'application/json'
              },
              redirect: 'follow'
            })

            return new Response(JSON.stringify({
              output: '',
              messages: [
                {
                  owner: 'SIGNERS_WALLET_ADDRESS',
                  target: 'myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc',
                  anchor: 'process-id:message-id:counter',
                  tags: [
                    { name: 'Forwarded-For', value: 'b09lyYWG6jZabiyZrZS2meWUyZXspaX4TCfDmH1KDmI' },
                    { name: 'Data-Protocol', value: 'ao' },
                    { name: 'ao-type', value: 'message' },
                    { name: 'function', value: 'notify' },
                    { name: 'notify-function', value: 'transfer' },
                    { name: 'from', value: 'SIGNERS_WALLET_ADDRESS' },
                    { name: 'qty', value: '1000' }
                  ],
                  data: ''
                }
              ],
              spawns: []
            }))
          },
          logger
        })
      )

      await loadResult({ id: 'message-123', processId: 'process-123' })
        .then(res => assert.deepStrictEqual(res, {
          output: '',
          messages: [
            {
              owner: 'SIGNERS_WALLET_ADDRESS',
              target: 'myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc',
              anchor: 'process-id:message-id:counter',
              tags: [
                { name: 'Forwarded-For', value: 'b09lyYWG6jZabiyZrZS2meWUyZXspaX4TCfDmH1KDmI' },
                { name: 'Data-Protocol', value: 'ao' },
                { name: 'ao-type', value: 'message' },
                { name: 'function', value: 'notify' },
                { name: 'notify-function', value: 'transfer' },
                { name: 'from', value: 'SIGNERS_WALLET_ADDRESS' },
                { name: 'qty', value: '1000' }
              ],
              data: ''
            }
          ],
          spawns: []
        }))
    })
  })
})
