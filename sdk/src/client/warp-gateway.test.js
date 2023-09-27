import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployContractWith } from './warp-gateway.js'

const WARP_GATEWAY_URL = globalThis.WARP_GATEWAY_URL || 'https://gw.warp.cc'
const logger = createLogger('@permaweb/ao-sdk:readState')

describe('warp-gateway', () => {
  describe('deplyContractsWith', () => {
    test('deploy the contract to the warp gateway', async () => {
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
            body: 'raw-123'
          })

          return new Response(JSON.stringify({ foo: 'bar' }))
        }
      })

      const res = await deployContract({ id: 'data-item-123', raw: 'raw-123' })

      assert.deepStrictEqual(res, {
        res: { foo: 'bar' },
        dataItemId: 'data-item-123'
      })
    })
  })
})
