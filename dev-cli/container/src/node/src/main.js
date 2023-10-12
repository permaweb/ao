class WalletNotFoundError extends Error {
  code = 'WalletNotFound'
}
class ArtifactNotFoundError extends Error {
  code = 'ArtifactNotFound'
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
 * @callback ArtifactExists
 * @param {string} path
 * @returns {Promise<boolean>} whether or not the artifact exists at the specified path
 *
 * @callback ReadWallet
 * @param {string} path the path to the wallet
 * @returns {Promise<any>} the parsed wallet
 */

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
 * @callback Upload
 * @param {string} path
 * @param {string} to
 * @param {string} wallet
 *
 * @typedef Environment
 * @property {WalletExists} walletExists
 * @property {ArtifactExists} artifactExists
 * @property {ReadWallet} readWallet
 * @property {Upload} upload
 *
 * @param {Environment} env
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
  ({ walletExists, artifactExists, readWallet, upload }) =>
    async (
      { walletPath, artifactPath, to, ...rest }
    ) => {
      if (!(await walletExists(walletPath))) throw new WalletNotFoundError()
      if (!(await artifactExists(artifactPath))) {
        throw new ArtifactNotFoundError()
      }

      const wallet = await readWallet(walletPath)
      const res = await upload({
        path: artifactPath,
        to,
        wallet,
        ...rest
      })
      return res.id
    }

/**
 * Create a contract
 *
 * @callback Create
 * @param {string} src
 * @param {string} initialState
 * @param {Function} signer
 * @param {Tag[]} tags
 *
 * @typedef Environment2
 * @property {WalletExists} walletExists
 * @property {ReadWallet} readWallet
 * @property {Create} create
 *
 * @param {Environment2} env
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
    async (
      { walletPath, src, tags, initialState }
    ) => {
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
