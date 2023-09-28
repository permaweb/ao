import { Buffer } from 'buffer'
import WarpArBundles from 'warp-arbundles'

const { DataItem } = WarpArBundles

/**
 * Adapted from:
 * https://github.com/warp-contracts/warp-contracts-plugins/blob/cacb84e41da8936184ed0d7792feb93d04fec825/warp-contracts-plugin-signature/src/web/arweave/InjectedArweaveSigner.ts#L6
 *
 * Constants copied from https://github.com/Bundlr-Network/arbundles/blob/4c90af5a71b14a3c1a213b84fa9edb545b48b8a2/src/constants.ts#L18
 */
class InjectedArweaveSigner {
  constructor (windowArweaveWallet, createDataItem) {
    this.signer = windowArweaveWallet
    this.createDataItem = createDataItem
    this.ownerLength = 512
    this.signatureLength = 512
    this.signatureType = 1
  }

  async createAndSignDataItem (data, tags) {
    const buf = Buffer.from(await this.signer.signDataItem({ data, tags }))
    const dataI = this.createDataItem(buf)
    return dataI
  }
}

/**
 * A function that builds a signer using the global arweaveWallet
 * commonly used in browser-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export function createDataItemSigner (arweaveWallet) {
  /**
   * createDataItem can be passed here for the purposes of unit testing
   * with a stub
   */
  return async ({ data, tags, createDataItem = (buf) => new DataItem(buf) }) => {
    const signer = new InjectedArweaveSigner(arweaveWallet, createDataItem)
    return signer.createAndSignDataItem(data, tags)
      .then(async dataItem => ({
        id: await dataItem.id,
        raw: await dataItem.getRaw()
      }))
  }
}
