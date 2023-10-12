import { DEFAULT_BUNDLER_HOST } from './defaults.js'

export class WalletNotFoundError extends Error {
  static code = 'WalletNotFound'
  code = 'WalletNotFound'
}
export class ArtifactNotFoundError extends Error {
  static code = 'ArtifactNotFound'
  code = 'ArtifactNotFound'
}

export class BundlerHostNotSupportedError extends Error {
  static code = 'BundleHostNotSupported'
  code = 'BundleHostNotSupported'
}

export class InvalidFundAmountError extends Error {
  static code = 'InvalidFundAmount'
  code = 'InvalidFundAmount'
}

export const SUPPORTED_BUNDLERS = {
  IRYS: 'IRYS'
}

/**
 * @typedef Tag
 * @property {string} name
 * @property {string} value
 *
 * @callback WalletExists
 * @param {string} path
 * @returns {Promise<boolean>} whether or not the wallet exists at the specified path
 *
 * @callback ReadWallet
 * @param {string} path the path to the wallet
 * @returns {Promise<any>} the parsed wallet
 */

export const determineBundlerHost = (host) => {
  if (host.includes('irys.xyz')) return SUPPORTED_BUNDLERS.IRYS
}

/**
 * Given a command delimited string of {name}:{value} tags, return an array
 * of tags.
 *
 * This function will strip whitespace on both names and values
 *
 * @param {string} tagsStr
 * @returns {Tag[]} an array of parsed tags
 */
export const parseTags = (tagsStr) =>
  tagsStr
    ? tagsStr
      .split(',')
      .map((pairs) => pairs.trim()) // ['foo:bar', 'fizz: buzz']
      .map((pairs) => pairs.split(':').map((v) => v.trim())) // [['foo', 'bar'], ['fizz', 'buzz']]
      .map(([name, value]) => ({ name, value }))
    : [] // TODO: filter out dups?

/**
 * A reusuable upload client to upload any artifact
 * to any destination that implements the api
 *
 * @callback ArtifactExists
 * @param {string} path
 * @returns {Promise<boolean>} whether or not the artifact exists at the specified path
 *
 * @callback Upload
 * @param { path: string, wallet: string, to: string, ...rest: Object<string, unknown> } args
 *
 * @typedef UploaderEnvironment
 * @property {WalletExists} walletExists
 * @property {ArtifactExists} artifactExists
 * @property {ReadWallet} readWallet
 * @property {Object<string, Upload>} uploaders
 *
 * @param {UploaderEnvironment} env
 *
 * @typedef UploaderArgs
 * @property {string} walletPath
 * @property {string} artifactPath
 * @property {string} to
 *
 * @callback Uploader
 * @param {UploaderArgs} args
 * @returns {Promise<string>} the id of the transaction
 *
 * @returns {Uploader}
 */
export const uploadWith =
  ({ walletExists, artifactExists, readWallet, uploaders }) =>
    async ({ walletPath, artifactPath, to, ...rest }) => {
      if (!(await walletExists(walletPath))) throw new WalletNotFoundError()
      if (!(await artifactExists(artifactPath))) throw new ArtifactNotFoundError()

      to = to || DEFAULT_BUNDLER_HOST

      const bundlerHost = determineBundlerHost(to)
      if (!bundlerHost) throw new BundlerHostNotSupportedError()

      const upload = uploaders[bundlerHost]

      const wallet = await readWallet(walletPath)
      const res = await upload({ path: artifactPath, to, wallet, ...rest })
      return res.id
    }

/**
 * Create a contract
 *
 * @callback Create
 * @param {{ src: string, tags: Tag[], initialState: Object, wallet: unknown }} args
 *
 * @typedef CreateEnvironment
 * @property {WalletExists} walletExists
 * @property {ReadWallet} readWallet
 * @property {Create} create
 *
 * @param {CreateEnvironment} env
 *
 * @typedef CreateContractArgs
 * @property {string} walletPath
 * @property {string} src
 * @property {Tag[]} tags
 * @property {string} initialState
 *
 * @callback CreateContract
 * @param {CreateContractArgs} args
 * @returns {Promise<string>} the id of the transaction
 *
 * @returns {CreateContract}
 */
export const createContractWith =
  ({ walletExists, readWallet, create }) =>
    async ({ walletPath, src, tags, initialState }) => {
      if (!(await walletExists(walletPath))) throw new WalletNotFoundError()

      const wallet = await readWallet(walletPath)
      const res = await create({
        src,
        tags,
        initialState: JSON.parse(initialState),
        wallet
      })
      return res.contractId
    }

/**
 * @callback Balance
 * @param { wallet: string, to: string } args
 *
 * @typedef BalanceEnvironment
 * @property {WalletExists} walletExists
 * @property {ReadWallet} readWallet
 * @property {Object<string, Balance>} balancers
 *
 * @param {BalanceEnvironment} env
 *
 * @typedef BalancerArgs
 * @property {string} walletPath
 * @property {string} to
 *
 * @callback Balancer
 * @param {BalancerArgs} args
 * @returns {Promise<number>} the balance on the bundler
 *
 * @returns {Balancer}
 */
export const checkBalanceWith =
  ({ walletExists, readWallet, balancers }) =>
    async ({ walletPath, to }) => {
      if (!(await walletExists(walletPath))) throw new WalletNotFoundError()

      to = to || DEFAULT_BUNDLER_HOST

      const bundlerHost = determineBundlerHost(to)
      if (!bundlerHost) throw new BundlerHostNotSupportedError()

      const balance = balancers[bundlerHost]

      const wallet = await readWallet(walletPath)
      const res = await balance({ wallet, to })
      return res.balance
    }

/**
 * @callback Fund
 * @param { wallet: string, to: string, amount: number } args
 *
 * @typedef FundEnvironment
 * @property {WalletExists} walletExists
 * @property {ReadWallet} readWallet
 * @property {Object<string, Fund>} funders
 *
 * @param {FundEnvironment} env
 *
 * @typedef FunderArgs
 * @property {string} walletPath
 * @property {string} to
 * @property {number} amount
 *
 * @callback Funder
 * @param {FunderArgs} args
 * @returns {Promise<string>} the transaction id to fund the bundler
 *
 * @returns {Funder}
 */
export const fundWith =
  ({ walletExists, readWallet, funders }) =>
    async ({ walletPath, to, amount }) => {
      if (!amount || amount < 0) throw new InvalidFundAmountError()
      if (!(await walletExists(walletPath))) throw new WalletNotFoundError()

      to = to || DEFAULT_BUNDLER_HOST

      const bundlerHost = determineBundlerHost(to)
      if (!bundlerHost) throw new BundlerHostNotSupportedError()

      const fund = funders[bundlerHost]

      const wallet = await readWallet(walletPath)
      const res = await fund({ wallet, to, amount })
      return res.id
    }
