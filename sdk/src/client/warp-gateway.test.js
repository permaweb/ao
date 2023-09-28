import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployContractWith } from './warp-gateway.js'

const WARP_GATEWAY_URL = globalThis.WARP_GATEWAY_URL || 'https://gw.warp.cc'
const logger = createLogger('@permaweb/ao-sdk:readState')

describe('warp-gateway', () => {
  describe('deplyContractsWith', () => {
    test('sign and deploy the contract, and return the id', async () => {
      const deployContract = deployContractWith({
        WARP_GATEWAY_URL,
        logger,
        fetch: async (url, options) => {
          assert.equal(url, `${WARP_GATEWAY_URL}/gateway/contracts/deploy-bundled`)
          assert.deepStrictEqual(options, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              Accept: 'application/json'
            },
            body: 'raw-buffer'
          })

          return new Response(JSON.stringify({ foo: 'bar' }))
        }
      })

      const res = await deployContract({
        data: '1234',
        tags: [],
        signer: async () => ({ id: 'data-item-123', raw: 'raw-buffer' })
      })

      assert.deepStrictEqual(res, {
        res: { foo: 'bar' },
        dataItemId: 'data-item-123'
      })
    })

    test('replace the Content-Type tag and data', async () => {
      const deployContract = deployContractWith({
        WARP_GATEWAY_URL,
        logger,
        fetch: async (url, options) => new Response(JSON.stringify({ foo: 'bar' }))
      })

      await deployContract({
        data: '1234',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'SDK', value: 'ao' }
        ],
        signer: async ({ data, tags }) => {
          assert.deepStrictEqual(JSON.parse(data.toString()), {
            manifest: 'arweave/paths',
            version: '0.1.0',
            paths: {}
          })
          assert.deepStrictEqual(tags, [
            { name: 'foo', value: 'bar' },
            { name: 'SDK', value: 'ao' },
            { name: 'Content-Type', value: 'application/x.arweave-manifest+json' }
          ])

          return { id: 'contract-id-123', raw: 'raw-buffer' }
        }
      })
    })
  })
})
