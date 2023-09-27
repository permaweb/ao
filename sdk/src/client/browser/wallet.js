import { Buffer } from 'buffer'
import WarpArBundles from 'warp-arbundles'

const { DataItem } = WarpArBundles

/**
 * Build a wallet instance based on the browser environment
 *
 * we inject these as part of the entrypoint, which allows us
 * to unit test this logic using stubs
 */

/**
 * TODO: figure out api to inject, so we can unit test this
 */
export function createAndSignWith ({ createDataItem = (buf) => new DataItem(buf) }) {
  return async ({ data, tags, wallet }) => {
    const signer = new InjectedArweaveSigner(wallet, createDataItem)
    return signer.signDataItem(data, tags)
      .then(async dataItem => ({
        id: await dataItem.id,
        raw: await dataItem.getRaw()
      }))
  }
}

/**
 * implement to check if the arweaveWallet exists on window
 */
export function walletExistsWith ({ walletExists = (wallet = globalThis.arweaveWallet) => !!wallet } = {}) {
  return async (wallet) => walletExists(wallet)
}

/**
   * implement to read the arweaveWallet on window
   */
export function readWalletWith ({ readWallet = (wallet = globalThis.arweaveWallet) => wallet } = {}) {
  return async (wallet) => readWallet(wallet)
}

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

  async signDataItem (data, tags) {
    const buf = Buffer.from(await this.signer.signDataItem({ data, tags }))
    const dataI = this.createDataItem(buf)
    return dataI
  }
}
