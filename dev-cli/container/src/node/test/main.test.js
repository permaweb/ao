import { describe, it } from 'node:test'
import * as assert from 'node:assert'

import {
  ArtifactNotFoundError,
  BundlerHostNotSupportedError,
  SUPPORTED_BUNDLERS,
  WalletNotFoundError,
  createContractWith,
  uploadWith
} from '../src/main.js'
import { DEFAULT_BUNDLER_HOST } from '../src/defaults.js'

describe('uploadWith', () => {
  const happy = {
    walletExists: async () => true,
    artifactExists: async () => ({ foo: 'bar' }),
    readWallet: async () => ({ id: 'id-123' }),
    uploaders: {
      [SUPPORTED_BUNDLERS.IRYS]: async (params) => ({ params, id: '123' })
    }
  }

  it('should publish the artifact to arweave', async () => {
    const upload = uploadWith(happy)

    const res = await upload({
      walletPath: '/path/to/wallet.json',
      artifactPath: '/path/to/artifact.wasm',
      to: DEFAULT_BUNDLER_HOST,
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    })

    assert.equal(res, '123')
  })

  it('should default the "to" if not provided', async () => {
    const upload = uploadWith({
      ...happy,
      uploaders: {
        [SUPPORTED_BUNDLERS.IRYS]: (params) => {
          assert.deepStrictEqual(params, {
            path: '/path/to/artifact.wasm',
            wallet: { id: 'id-123' },
            to: DEFAULT_BUNDLER_HOST,
            tags: [
              { name: 'foo', value: 'bar' }
            ]
          })

          return { id: '123' }
        }
      }
    })

    await upload({
      walletPath: '/path/to/wallet.json',
      artifactPath: '/path/to/artifact.wasm',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    })
  })

  it('should pass the correct args to upload', async () => {
    const upload = uploadWith({
      ...happy,
      uploaders: {
        [SUPPORTED_BUNDLERS.IRYS]: (params) => {
          assert.deepStrictEqual(params, {
            path: '/path/to/artifact.wasm',
            wallet: { id: 'id-123' },
            to: DEFAULT_BUNDLER_HOST,
            tags: [
              { name: 'foo', value: 'bar' }
            ]
          })

          return { id: '123' }
        }
      }
    })

    await upload({
      walletPath: '/path/to/wallet.json',
      artifactPath: '/path/to/artifact.wasm',
      to: DEFAULT_BUNDLER_HOST,
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    })
  })

  it('should throw if the wallet does not exist', async () => {
    const upload = uploadWith({ ...happy, walletExists: async () => false })

    await upload({
      walletPath: '/path/to/wallet.json',
      artifactPath: '/path/to/artifact.wasm',
      to: DEFAULT_BUNDLER_HOST,
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, WalletNotFoundError.code))
  })

  it('should throw if the artifact does not exist', async () => {
    const upload = uploadWith({ ...happy, artifactExists: async () => false })

    await upload({
      walletPath: '/path/to/wallet.json',
      artifactPath: '/path/to/artifact.wasm',
      to: DEFAULT_BUNDLER_HOST,
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, ArtifactNotFoundError.code))
  })

  it('should throw if the bundler is not supported', async () => {
    const upload = uploadWith({ ...happy, uploaders: { NOT_SUPPORTED: async (params) => ({ params, id: '123' }) } })

    await upload({
      walletPath: '/path/to/wallet.json',
      artifactPath: '/path/to/artifact.wasm',
      to: 'https://fake.place',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, BundlerHostNotSupportedError.code))
  })
})

describe('createContractWith', () => {
  const happy = {
    walletExists: async () => true,
    readWallet: async () => ({ id: 'id-123' }),
    create: async (params) => ({ params, contractId: '123' })
  }

  it('should publish the contract', async () => {
    const contract = createContractWith(happy)

    const res = await contract({
      walletPath: '/path/to/wallet.json',
      src: 'src-tx-123',
      tags: [
        { name: 'foo', value: 'bar' }
      ],
      initialState: JSON.stringify({ hello: 'world' })
    })

    assert.equal(res, '123')
  })

  it('should pass the correct args to create', async () => {
    const contract = createContractWith({
      ...happy,
      create: (params) => {
        assert.deepStrictEqual(params, {
          src: 'src-tx-123',
          tags: [
            { name: 'foo', value: 'bar' }
          ],
          initialState: { hello: 'world' },
          wallet: { id: 'id-123' }
        })

        return { id: '123' }
      }
    })

    await contract({
      walletPath: '/path/to/wallet.json',
      src: 'src-tx-123',
      tags: [
        { name: 'foo', value: 'bar' }
      ],
      initialState: JSON.stringify({ hello: 'world' })
    })
  })

  it('should throw if the wallet does not exist', async () => {
    const contract = createContractWith({
      ...happy,
      walletExists: async () => false
    })

    await contract({
      walletPath: '/path/to/wallet.json',
      src: 'src-tx-123',
      tags: [
        { name: 'foo', value: 'bar' }
      ],
      initialState: JSON.stringify({ hello: 'world' })
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, 'WalletNotFound'))
  })
})
