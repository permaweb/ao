import { of, fromPromise } from 'hyper-async'
import { Buffer } from 'buffer/index.js'
import WarpArBundles from 'warp-arbundles'

const { DataItem } = WarpArBundles

if (!globalThis.Buffer) globalThis.Buffer = Buffer

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
  const signer = async ({ data, tags, createDataItem = (buf) => new DataItem(buf) }) => {
    const iSigner = new InjectedArweaveSigner(arweaveWallet, createDataItem)
    return iSigner.createAndSignDataItem(data, tags)
      .then(async dataItem => ({
        id: await dataItem.id,
        raw: await dataItem.getRaw()
      }))
  }

  signer._ = () => arweaveWallet

  return signer
}

/**
 * deploy a contract using the arweaveWallet in the browser
 *
 * allow stubbing arweaveWallet for the purpose of testing
 */
export function deployContractWith ({ logger: _logger, arweaveWallet = globalThis.arweaveWallet }) {
  const logger = _logger.child('web-wallet:deployContract')

  return (args) =>
    of(args)
      .map(logger.tap('deploying contract via the arweaveWallet'))
      /**
       * a signer function is passed as a parameter, but is unused
       * when deploying a contract in the browser, because we instead
       *
       * simply call dispatch() on the arweaveWallet itself, which handles signing
       */
      .chain(fromPromise(({ data, tags, signer: _signer }) =>
        arweaveWallet.createTransaction({ data })
          .then(transaction => {
            tags.forEach(({ name, value }) => transaction.addTag(name, value))
            return transaction
          })
          .then(transaction => arweaveWallet.dispatch(transaction))
      ))
      .bimap(
        logger.tap('Error encountered when deploying bundled contract via the arweave web wallet'),
        logger.tap('Successfully deployed bundled contract via the arweave web wallet')
      )
      /**
       * https://cookbook.g8way.io/guides/posting-transactions/dispatch.html
       *
       * for shape
       */
      .map(res => ({ res, contractId: res.id }))
      .toPromise()
}
