import * as WarpArBundles from 'warp-arbundles'
import { EthereumSigner } from 'arbundles'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'

/**
 * hack to get module resolution working on node jfc
 */
const pkg = WarpArBundles.default ? WarpArBundles.default : WarpArBundles
const { createData, ArweaveSigner } = pkg

/**
 * A function that builds a signer using a wallet jwk interface
 * commonly used in node-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 *
 * @returns {Types['signer']}
 */
export function createDataItemSigner (wallet) {
  const signer = async ({ data, tags, target, anchor }) => {
    const signer = new ArweaveSigner(wallet)
    const dataItem = createData(data, signer, { tags, target, anchor })
    return dataItem.sign(signer)
      .then(async () => ({
        id: await dataItem.id,
        raw: await dataItem.getRaw()
      }))
  }

  return signer
}

export function createEthereumDataItemSigner (pk) {
  /**
   * createDataItem can be passed here for the purposes of unit testing
   * with a stub
   */
  const ethSigner = new EthereumSigner(pk)
  const signer = async ({ data, tags, target, anchor }) => {
    const dataItem = createData(data, ethSigner, { tags, target, anchor })

    const res = await dataItem.sign(ethSigner)
      .then(async () => ({
        id: await dataItem.id,
        raw: await dataItem.getRaw()

      })).catch((e) => console.error(e))

    return res
  }

  return signer
}
