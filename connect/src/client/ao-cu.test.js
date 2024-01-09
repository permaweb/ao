import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadResultSchema } from '../dal.js'
import { loadResultWith } from './ao-cu.js'

const logger = createLogger('ao-cu')

describe('ao-cu', () => {
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
              }
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
