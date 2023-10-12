import { describe, it } from 'node:test'
import * as assert from 'node:assert'

import {
  ArtifactNotFoundError,
  BundlerHostNotSupportedError,
  InvalidFundAmountError,
  SUPPORTED_BUNDLERS,
  WalletNotFoundError,
  checkBalanceWith,
  createContractWith,
  fundWith,
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
    const upload = uploadWith(happy)

    await upload({
      walletPath: '/path/to/wallet.json',
      artifactPath: '/path/to/artifact.wasm',
      to: 'https://unsupported.bundler',
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

describe('checkBalanceWith', () => {
  const happy = {
    walletExists: async () => true,
    readWallet: async () => ({ id: 'id-123' }),
    balancers: {
      [SUPPORTED_BUNDLERS.IRYS]: async () => ({ balance: 123 })
    }
  }

  it('should retrieve the balance', async () => {
    const balance = checkBalanceWith(happy)

    const res = await balance({
      walletPath: '/path/to/wallet.json',
      to: DEFAULT_BUNDLER_HOST
    })

    assert.equal(res, 123)
  })

  it('should default the to if not provided', async () => {
    const balance = checkBalanceWith({
      ...happy,
      balancers: {
        [SUPPORTED_BUNDLERS.IRYS]: async (params) => {
          assert.deepStrictEqual(params, {
            wallet: { id: 'id-123' },
            to: DEFAULT_BUNDLER_HOST
          })

          return { balance: '123' }
        }
      }
    })

    await balance({
      walletPath: '/path/to/wallet.json'
    })
  })

  it('should pass the correct args to balancer', async () => {
    const balance = checkBalanceWith({
      ...happy,
      balancers: {
        [SUPPORTED_BUNDLERS.IRYS]: async (params) => {
          assert.deepStrictEqual(params, {
            wallet: { id: 'id-123' },
            to: DEFAULT_BUNDLER_HOST
          })

          return { balance: '123' }
        }
      }
    })

    await balance({
      walletPath: '/path/to/wallet.json',
      to: DEFAULT_BUNDLER_HOST
    })
  })

  it('should throw if the wallet does not exist', async () => {
    const balance = checkBalanceWith({ ...happy, walletExists: async () => false })

    await balance({
      walletPath: '/path/to/wallet.json',
      to: DEFAULT_BUNDLER_HOST
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, WalletNotFoundError.code))
  })

  it('should throw if the bundler is not supported', async () => {
    const balance = checkBalanceWith(happy)

    await balance({
      walletPath: '/path/to/wallet.json',
      to: 'https://unsupported.bundler'
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, BundlerHostNotSupportedError.code))
  })
})

describe('fundWith', () => {
  const happy = {
    walletExists: async () => true,
    readWallet: async () => ({ id: 'id-123' }),
    funders: {
      [SUPPORTED_BUNDLERS.IRYS]: async () => ({ id: '123' })
    }
  }

  it('should fund the bundler', async () => {
    const fund = fundWith(happy)

    const res = await fund({
      walletPath: '/path/to/wallet.json',
      to: DEFAULT_BUNDLER_HOST,
      amount: 500000000
    })

    assert.equal(res, '123')
  })

  it('should default the to if not provided', async () => {
    const fund = fundWith({
      ...happy,
      funders: {
        [SUPPORTED_BUNDLERS.IRYS]: async (params) => {
          assert.deepStrictEqual(params, {
            wallet: { id: 'id-123' },
            to: DEFAULT_BUNDLER_HOST,
            amount: 500000000
          })

          return { id: '123' }
        }
      }
    })

    await fund({
      walletPath: '/path/to/wallet.json',
      amount: 500000000
    })
  })

  it('should pass the correct args to funder', async () => {
    const fund = fundWith({
      ...happy,
      funders: {
        [SUPPORTED_BUNDLERS.IRYS]: async (params) => {
          assert.deepStrictEqual(params, {
            wallet: { id: 'id-123' },
            to: DEFAULT_BUNDLER_HOST,
            amount: 500000000
          })

          return { id: '123' }
        }
      }
    })

    await fund({
      walletPath: '/path/to/wallet.json',
      to: DEFAULT_BUNDLER_HOST,
      amount: 500000000
    })
  })

  it('should throw if the amount is not greater than 0', async () => {
    const fund = fundWith(happy)

    await fund({
      walletPath: '/path/to/wallet.json',
      to: DEFAULT_BUNDLER_HOST,
      amount: -20
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, InvalidFundAmountError.code))
  })

  it('should throw if the wallet does not exist', async () => {
    const fund = fundWith({ ...happy, walletExists: async () => false })

    await fund({
      walletPath: '/path/to/wallet.json',
      to: DEFAULT_BUNDLER_HOST,
      amount: 500000000
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, WalletNotFoundError.code))
  })

  it('should throw if the bundler is not supported', async () => {
    const fund = fundWith(happy)

    await fund({
      walletPath: '/path/to/wallet.json',
      to: 'https://unsupported.bundler',
      amount: 500000000
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, BundlerHostNotSupportedError.code))
  })
})
