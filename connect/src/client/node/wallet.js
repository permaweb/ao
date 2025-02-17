import { constants, createPrivateKey, createHash, createSign } from 'node:crypto'

import * as WarpArBundles from 'warp-arbundles'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'
import { DATAITEM_SIGNER_KIND, HTTP_SIGNER_KIND } from '../signer.js'

/**
 * hack to get module resolution working on node jfc
 */
const pkg = WarpArBundles.default ? WarpArBundles.default : WarpArBundles
const { ArweaveSigner, DataItem } = pkg

function createANS104Signer ({ wallet, publicKey, address }) {
  const signer = async (create) => {
    const unsigned = await create({ publicKey, alg: 'rsa-v1_5-sha256', type: 1 })
    const dataItem = new DataItem(unsigned)
    return dataItem.sign(new ArweaveSigner(wallet))
      .then(async () => ({
        signature: dataItem.rawSignature,
        address
      }))
  }

  return signer
}

function createHttpSigner ({ wallet, publicKey, privateKey, address }) {
  const signer = async (create) => {
    const signatureBase = await create({
      type: 1,
      publicKey,
      alg: 'rsa-pss-sha512'
    })

    const signature = createSign('sha512')
      .update(signatureBase)
      .sign({ key: privateKey, padding: constants.RSA_PKCS1_PSS_PADDING })

    return { signature, address }
  }

  return signer
}

/**
 * A function that builds a signer using a wallet jwk interface
 * commonly used in node-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 *
 * @returns {Types['signer']}
 */
export function createSigner (wallet) {
  /**
   * n is the public modulus
   * (the base64url encoded public key)
   */
  const publicKey = Buffer.from(wallet.n, 'base64url')
  const privateKey = createPrivateKey({ key: wallet, format: 'jwk' })
  const address = createHash('sha256').update(publicKey).digest('base64url')

  const dataItemSigner = createANS104Signer({ wallet, publicKey, address })
  const httpSigner = createHttpSigner({ wallet, publicKey, privateKey, address })

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
 * Create a signer that uses the provided arweave wallet jwk
 * for signing
 */
export const createDataItemSigner = createSigner
