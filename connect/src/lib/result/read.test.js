import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { readWith } from './read.js'

describe('read', () => {
  test('should return the output', async () => {
    const read = readWith({
      loadResult: async (args) => {
        assert.deepStrictEqual(args, {
          id: 'message-123',
          processId: 'process-123'
        })

        return {
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
        }
      }
    })

    const res = await read({
      id: 'message-123',
      processId: 'process-123'
    }).toPromise()

    assert.deepStrictEqual(res, {
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
    })
  })
})
