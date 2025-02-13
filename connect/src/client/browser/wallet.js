import { Buffer } from 'buffer/index.js'
import * as WarpArBundles from 'warp-arbundles'
import { httpbis } from 'http-message-signatures'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'
import { httpSigName } from '../hb.js'

if (!globalThis.Buffer) globalThis.Buffer = Buffer

const { DataItem } = WarpArBundles
const { signMessage } = httpbis

/**
 * A function that builds a signer using the global arweaveWallet
 * commonly used in browser-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 *
 * @param {Object} arweaveWallet - The window.arweaveWallet object
 * @returns {Types['signer']} - The signer function
 * @example
 * const signer = createDataItemSigner(window.arweaveWallet)
 */
export function createDataItemSigner (arweaveWallet) {
  /**
   * createDataItem can be passed here for the purposes of unit testing
   * with a stub
   */
  const signer = async ({ data, tags, target, anchor, createDataItem = (buf) => new DataItem(buf) }) => {
    /**
     * signDataItem interface according to ArweaveWalletConnector
     *
     * https://github.com/jfbeats/ArweaveWalletConnector/blob/7c167f79cd0cf72b6e32e1fe5f988a05eed8f794/src/Arweave.ts#L46C23-L46C23
     */
    const view = await arweaveWallet.signDataItem({ data, tags, target, anchor })
    const dataItem = createDataItem(Buffer.from(view))
    return {
      id: await dataItem.id,
      raw: await dataItem.getRaw()
    }
  }

  return signer
}

export function createHbSigner (arweaveWallet) {
  const params = ['alg', 'keyid'].sort()

  let permsP
  const signer = async ({ fields, request }) => new Promise((resolve) => {
    if (!permsP) {
      permsP = arweaveWallet.connect([
        'ACCESS_ADDRESS',
        'ACCESS_PUBLIC_KEY',
        'SIGNATURE'
      ]).then(async () => {
        const publicKey = await arweaveWallet.getActivePublicKey()
        const address = await arweaveWallet.getActiveAddress()
        return { publicKey, address }
      })
    }

    return resolve(permsP)
  }).then(({ publicKey, address }) => {
    return signMessage({
      key: {
        id: publicKey,
        alg: 'rsa-pss-sha512',
        sign: async (data) => {
          const view = await arweaveWallet.signMessage(
            data,
            { hashAlgorithm: 'SHA-512' }
          )

          return Buffer.from(view)
        }
      },
      fields,
      name: httpSigName(address),
      params
    }, request)
  })

  return signer
}
