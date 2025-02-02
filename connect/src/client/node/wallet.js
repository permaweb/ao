import { createPrivateKey, createHash } from 'node:crypto'

import * as WarpArBundles from 'warp-arbundles'
import { httpbis, createSigner } from 'http-message-signatures'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'
import { httpSigName } from '../hb.js'

/**
 * hack to get module resolution working on node jfc
 */
const pkg = WarpArBundles.default ? WarpArBundles.default : WarpArBundles
const { createData, ArweaveSigner } = pkg
const { signMessage } = httpbis

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

export function createHbSigner (wallet) {
  /**
   * n is the public modulus
   * (the base64url encoded public key)
   */
  const publicKey = wallet.n
  const privateKey = createPrivateKey({ key: wallet, format: 'jwk' })
  const address = createHash('sha256')
    .update(Buffer.from(publicKey, 'base64url'))
    .digest('base64url')

  const s = createSigner(privateKey, 'rsa-pss-sha512', publicKey)
  const params = ['alg', 'keyid'].sort()

  const signer = async ({ fields, request }) =>
    signMessage({
      key: s,
      fields,
      name: httpSigName(address),
      params
    }, request)

  return signer
}
