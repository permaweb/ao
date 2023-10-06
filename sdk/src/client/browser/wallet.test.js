import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { deployContractSchema } from '../../dal.js'
import { createDataItemSigner, deployContractWith } from './wallet.js'

const logger = createLogger('@permaweb/ao-sdk:createContract')

describe('browser - wallet', () => {
  describe('createDataItemSigner', () => {
    test('should expose the wallet on _', () => {
      const sign = createDataItemSigner('wallet-123')
      assert.strictEqual(sign._(), 'wallet-123')
    })

    test('should create and sign the data item', async () => {
      /**
       * A mock of an actual arweaveWallet pulled from
       * globalThis or window
       *
       * We only stub signDataItem because it's the only
       * api needed for the trimmed down InjectedArweaveSigner
       */
      const stubArweaveWallet = {
        async signDataItem ({ data, tags }) {
          return Buffer.from(JSON.stringify({ data, tags }))
        }
      }

      const sign = createDataItemSigner(stubArweaveWallet)

      const res = await sign({
        data: 'foobar',
        tags: [{ name: 'foo', value: 'bar' }],
        /**
         * stub createDataItem
         */
        createDataItem (buf) {
          return {
            id: Promise.resolve('CPUgRQCmNxVnIVyfC69_ypDaMQTYNOU8jsMad4QFAS8'),
            getRaw: async () => buf
          }
        }
      })

      console.log('signedDataItem', res)
      assert.ok(res.id)
      assert.ok(res.raw)
    })
  })

  describe('deployContractWith', () => {
    test('should deploy the contract and return the contractId', async () => {
      /**
       * A mock of an actual arweaveWallet pulled from
       * globalThis or window
       */
      const stubArweaveWallet = {
        dispatch: async (transaction) => {
          assert.deepStrictEqual(transaction.data, 'foobar')
          return { id: 'contract-id-123' }
        }
      }

      const stubArweave = {
        createTransaction: async (args) => {
          assert.deepStrictEqual(args, { data: 'foobar' })
          return {
            data: args.data,
            addTag: (name, value) => {
              assert.deepStrictEqual({ name, value }, { name: 'foo', value: 'bar' })
            }
          }
        }
      }

      const deployContract = deployContractSchema.implement(
        deployContractWith({ logger, arweave: stubArweave, arweaveWallet: stubArweaveWallet })
      )

      const res = await deployContract({
        data: 'foobar',
        tags: [{ name: 'foo', value: 'bar' }],
        // Signer is unused by this implementation
        signer: async ({ data, tags }) => {}
      })

      assert.deepStrictEqual(res, { res: { id: 'contract-id-123' }, contractId: 'contract-id-123' })
    })
  })
})
