import { Buffer } from 'buffer/index.js'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'
import { DATAITEM_SIGNER_KIND, HTTP_SIGNER_KIND } from '../signer.js'
import { getRawAndId } from '../../lib/data-item.js'

if (!globalThis.Buffer) globalThis.Buffer = Buffer

function createANS104Signer (arweaveWallet) {
  /**
   * createDataItem can be passed here for the purposes of unit testing
   * with a stub
   */
  const signer = async (create) => {
    /**
     * set passthrough in order to receive the arguements as they were passed
     * to toDataItemSigner
     */
    const { data, tags, target, anchor } = await create({ alg: 'rsa-v1_5-sha256', passthrough: true })
    /**
     * https://github.com/wanderwallet/Wander?tab=readme-ov-file#signdataitemdataitem-promiserawdataitem
     */
    const view = await arweaveWallet.signDataItem({ data, tags, target, anchor })
    /**
     * Since we passthrough above, just send the precomputed
     * shape back
     */
    return getRawAndId(view)
  }

  return signer
}

function createHttpSigner (arweaveWallet) {
  const signer = async (create) => arweaveWallet.connect([
    'ACCESS_ADDRESS',
    'ACCESS_PUBLIC_KEY',
    'SIGNATURE'
  ]).then(async () => {
    const [publicKey, address] = await Promise.all([
      arweaveWallet.getActivePublicKey(),
      arweaveWallet.getActiveAddress()
    ])
    return { publicKey, address }
  }).then(async ({ publicKey, address }) => {
    const signatureBase = await create({
      type: 1,
      publicKey,
      address,
      alg: 'rsa-pss-sha512'
    })

    const view = await arweaveWallet.signMessage(
      signatureBase,
      { hashAlgorithm: 'SHA-512' }
    )

    return {
      signature: Buffer.from(view),
      address
    }
  })

  return signer
}

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
 * const signer = createSigner(window.arweaveWallet)
 */
export function createSigner (wallet) {
  const dataItemSigner = createANS104Signer(wallet)
  const httpSigner = createHttpSigner(wallet)

  const signer = (create, kind) => {
    if (kind === DATAITEM_SIGNER_KIND) return dataItemSigner(create)
    if (kind === HTTP_SIGNER_KIND) return httpSigner(create)
    throw new Error(`signer kind unknown "${kind}"`)
  }

  return signer
}

/**
 * @deprecated - use createSigner() instead
 *
 * Create a signer that uses the provided arweaveWallet
 * commonly used as global in browser-based dApps
 */
export const createDataItemSigner = createSigner
