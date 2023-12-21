import { describe, it } from 'node:test'
import * as assert from 'node:assert'

import {
  ArtifactNotFoundError,
  BundlerHostNotSupportedError,
  InvalidFundAmountError,
  SUPPORTED_BUNDLERS,
  WalletNotFoundError,
  checkBalanceWith,
  spawnProcessWith,
  fundWith,
  uploadModuleWith,
  parseTags
} from '../src/main.js'
import { AoModuleTags, DEFAULT_BUNDLER_HOST } from '../src/defaults.js'

describe('parseTags', () => {
  it('should parse the zip', () => {
    assert.deepStrictEqual(
      parseTags(JSON.stringify([['foo', 'bar'], ['fizz', 'buzz']])),
      [
        { name: 'foo', value: 'fizz' },
        { name: 'bar', value: 'buzz' }
      ]
    )

    assert.deepStrictEqual(
      parseTags(JSON.stringify([['foo', 'bar'], ['fizz', 'buzz', 'extra']])),
      [
        { name: 'foo', value: 'fizz' },
        { name: 'bar', value: 'buzz' }
      ]
    )

    assert.deepStrictEqual(
      parseTags(JSON.stringify([[], []])),
      []
    )
  })
})

describe('uploadModuleWith', () => {
  const happy = {
    walletExists: async () => true,
    artifactExists: async () => ({ foo: 'bar' }),
    readWallet: async () => ({ id: 'id-123' }),
    uploaders: {
      [SUPPORTED_BUNDLERS.UP]: async (params) => ({ params, id: '123' })
    }
  }

  describe('should use the first tag', () => {
    it('Module-Format', async () => {
      const upload = uploadModuleWith({
        ...happy,
        uploaders: {
          [SUPPORTED_BUNDLERS.UP]: async (params) => {
            /**
             * custom tag, plus default tags, then only use
             * the first Module-Format tag
             */
            assert.equal(params.tags.length, 8)
            return { params, id: '123' }
          }
        }
      })

      await upload({
        walletPath: '/path/to/wallet.json',
        artifactPath: '/path/to/artifact.wasm',
        to: DEFAULT_BUNDLER_HOST,
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'Module-Format', value: 'wasi32' },
          ...AoModuleTags
        ]
      })
    })

    it('Input-Encoding', async () => {
      const upload = uploadModuleWith({
        ...happy,
        uploaders: {
          [SUPPORTED_BUNDLERS.UP]: async (params) => {
            /**
             * custom tag, plus default tags, then only use
             * the first Input-Encoding tag
             */
            assert.equal(params.tags.length, 8)
            return { params, id: '123' }
          }
        }
      })

      await upload({
        walletPath: '/path/to/wallet.json',
        artifactPath: '/path/to/artifact.wasm',
        to: DEFAULT_BUNDLER_HOST,
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'Input-Encoding', value: 'ANS-104' },
          ...AoModuleTags
        ]
      })
    })

    it('Output-Encoding', async () => {
      const upload = uploadModuleWith({
        ...happy,
        uploaders: {
          [SUPPORTED_BUNDLERS.UP]: async (params) => {
            /**
             * custom tag, plus default tags, then only use
             * the first Input-Encoding tag
             */
            assert.equal(params.tags.length, 8)
            return { params, id: '123' }
          }
        }
      })

      await upload({
        walletPath: '/path/to/wallet.json',
        artifactPath: '/path/to/artifact.wasm',
        to: DEFAULT_BUNDLER_HOST,
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'Output-Encoding', value: 'ANS-104' },
          ...AoModuleTags
        ]
      })
    })
  })

  it('should publish the artifact', async () => {
    const upload = uploadModuleWith(happy)

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
    const upload = uploadModuleWith({
      ...happy,
      uploaders: {
        [SUPPORTED_BUNDLERS.UP]: (params) => {
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
    const upload = uploadModuleWith({
      ...happy,
      uploaders: {
        [SUPPORTED_BUNDLERS.UP]: (params) => {
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
    const upload = uploadModuleWith({ ...happy, walletExists: async () => false })

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
    const upload = uploadModuleWith({ ...happy, artifactExists: async () => false })

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
    const upload = uploadModuleWith(happy)

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
    create: async (params) => ({ params, processId: '123' })
  }

  it('should publish the contract', async () => {
    const spawnProcess = spawnProcessWith(happy)

    const res = await spawnProcess({
      walletPath: '/path/to/wallet.json',
      module: 'module-tx-123',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    })

    assert.equal(res, '123')
  })

  it('should pass the correct args to create', async () => {
    const spawnProcess = spawnProcessWith({
      ...happy,
      create: (params) => {
        assert.deepStrictEqual(params, {
          module: 'module-tx-123',
          tags: [
            { name: 'foo', value: 'bar' }
          ],
          wallet: { id: 'id-123' }
        })

        return { processId: '123' }
      }
    })

    await spawnProcess({
      walletPath: '/path/to/wallet.json',
      module: 'module-tx-123',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    })
  })

  it('should throw if the wallet does not exist', async () => {
    const contract = spawnProcessWith({
      ...happy,
      walletExists: async () => false
    })

    await contract({
      walletPath: '/path/to/wallet.json',
      module: 'module-tx-123',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).then(assert.fail)
      .catch((err) => assert.equal(err.code, 'WalletNotFound'))
  })
})

describe('checkBalanceWith', () => {
  const happy = {
    walletExists: async () => true,
    readWallet: async () => ({ id: 'id-123' }),
    balancers: {
      [SUPPORTED_BUNDLERS.UP]: async () => ({ balance: 123 })
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
        [SUPPORTED_BUNDLERS.UP]: async (params) => {
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
        [SUPPORTED_BUNDLERS.UP]: async (params) => {
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
      [SUPPORTED_BUNDLERS.UP]: async () => ({ id: '123' })
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
        [SUPPORTED_BUNDLERS.UP]: async (params) => {
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
        [SUPPORTED_BUNDLERS.UP]: async (params) => {
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
