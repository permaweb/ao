import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployContractSchema, registerContractSchema, signerSchema } from '../dal.js'
import { deployContractWith, registerContractWith } from './warp-gateway.js'

const WARP_GATEWAY_URL = globalThis.WARP_GATEWAY_URL || 'https://gw.warp.cc'
const IRYS_NODE = globalThis.IRYS_NODE || 'node2'
const logger = createLogger('@permaweb/ao-sdk:readState')

describe('warp-gateway', () => {
  describe('deplyContractsWith', () => {
    test('sign and deploy the contract, and return the id', async () => {
      const deployContract = deployContractSchema.implement(
        deployContractWith({
          WARP_GATEWAY_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, `${WARP_GATEWAY_URL}/gateway/v2/contracts/deploy`)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Accept-Encoding': 'gzip, deflate, br',
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify({
                contract: 'raw-buffer'
              })
            })

            return new Response(JSON.stringify({ contractTxId: 'bar-tx-123', foo: 'bar' }))
          }
        })
      )

      const res = await deployContract({
        data: '1234',
        tags: [],
        signer: signerSchema.implement(
          async () => ({ id: 'data-item-123', raw: 'raw-buffer' })
        )
      })

      assert.deepStrictEqual(res, {
        res: { contractTxId: 'bar-tx-123', foo: 'bar' },
        contractId: 'bar-tx-123'
      })
    })

    test('replace the SDK tag and add a Nonce tag', async () => {
      const time = new Date().getTime()
      const deployContract = deployContractSchema.implement(
        deployContractWith({
          WARP_GATEWAY_URL,
          logger,
          fetch: async (url, options) => new Response(JSON.stringify({ contractTxId: 'bar-tx-123', foo: 'bar' })),
          getTime: () => time
        })
      )

      await deployContract({
        data: '1234',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'SDK', value: 'ao' },
          { name: 'Content-Type', value: 'text/plain' }
        ],
        signer: signerSchema.implement(
          async ({ data, tags }) => {
            assert.ok(data)
            assert.deepStrictEqual(tags, [
              { name: 'foo', value: 'bar' },
              { name: 'Content-Type', value: 'text/plain' },
              { name: 'SDK', value: 'Warp' },
              { name: 'Nonce', value: `${time}` }
            ])

            return { id: 'contract-id-123', raw: 'raw-buffer' }
          }
        )
      })
    })
  })

  describe('registerContractWith', () => {
    test('register the contract, and return the id', async () => {
      const registerContract = registerContractSchema.implement(
        registerContractWith({
          IRYS_NODE,
          WARP_GATEWAY_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, `${WARP_GATEWAY_URL}/gateway/contracts/register`)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify({
                contractId: 'contract-123',
                id: 'contract-123',
                irysNode: IRYS_NODE,
                bundlrNode: IRYS_NODE,
                node: IRYS_NODE
              })
            })

            return new Response(JSON.stringify({ contractTxId: 'bar-tx-123', foo: 'bar' }))
          }
        })
      )

      const res = await registerContract({ contractId: 'contract-123' })

      assert.deepStrictEqual(res, {
        res: { contractTxId: 'bar-tx-123', foo: 'bar' },
        contractId: 'contract-123'
      })
    })

    test('throw if the IRYS_NODE is not valid', async () => {
      await Promise.resolve()
        .then(() => registerContractWith({
          IRYS_NODE: 'invalidNode',
          logger,
          fetch: async () => assert.fail('unreachable')
        }))
        .catch(err => {
          console.log(err)
          assert.ok(err)
        })
    })
  })
})
