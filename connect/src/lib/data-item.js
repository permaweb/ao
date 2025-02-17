import { Buffer as BufferShim } from 'buffer/index.js'
import base64url from 'base64url'
import * as ArBundles from '@dha-team/arbundles'

if (!globalThis.Buffer) globalThis.Buffer = BufferShim

/**
 * hack to get module resolution working on node jfc
 *
 * @type {ArBundles}
 */
const pkg = ArBundles.default ? ArBundles.default : ArBundles
const { createData, DataItem, SIG_CONFIG } = pkg

/**
 * Abstract @dha-team/arbundles away,
 * to hedge against rolling needed functionality
 * directly into aoconnect, later
 *
 * TODO:
 *
 * ANS-104 implictly requires a signature type ->
 * signature meta registry.
 *
 * It is not ideal that this is in code, as the registry
 * is effectively hardcoded and esoteric in this way.
 * This precedent seems to have been set with the arbundles
 * implementation
 *
 * Perhaps eventually each of these signature types
 * would be public somehwere ie. recursively defined Data Items that each implement
 * a Data-Protocol for "Data Item Signature Type", on arweave.
 */

/**
 * @typedef DataItemSignerInfo
 * @property {SignatureTypes} type
 * @property {string} publicKey
 *
 * @typedef {Object} DataItemCreateOptions
 * @property {string} [target] - Optional target value.
 * @property {string} [anchor] - Optional anchor value.
 * @property {{ name: string; value: string }[]} [tags] - Optional array of tag objects.
 *
 * @param {string | Uint8Array} data - the data to be encoded into the Data Item
 * @param {DataItemSignerInfo} signer - the signature type and corresponding publicKey as a Uint8Array
 * @param {DataItemCreateOptions} opts - named data to be encoded into the Data Item
 * @returns {Uint8Array}
 */
export function createDataItemBytes (data, signer, opts) {
  /**
   * Hack to match expected shape for arbundles signer
   * meta in order to create the data item, while minimizing
   * bleed into other parts of code
   */
  const signerMeta = SIG_CONFIG[signer.type]
  if (!signerMeta) throw new Error(`Metadata for signature type ${signer.type} not found`)
  signerMeta.signatureType = signer.type
  signerMeta.ownerLength = signerMeta.pubLength
  signerMeta.signatureLength = signerMeta.sigLength
  signerMeta.publicKey = signer.publicKey

  const dataItem = createData(data, signerMeta, opts)
  return dataItem.getRaw()
}

export async function getRawAndId (dataItemBytes) {
  const dataItem = new DataItem(dataItemBytes)

  /**
   * arbundles dataItem.id does not work in browser environments
   * so we replicate it's behavior using impl that works
   * on node and browser
   */
  const rawSignature = dataItem.rawSignature
  const rawId = await crypto.subtle.digest('SHA-256', rawSignature)

  return {
    id: base64url.encode(Buffer.from(rawId)),
    raw: dataItem.getRaw()
  }
}

export function getSignatureData (dataItemBytes) {
  const dataItem = new DataItem(dataItemBytes)
  return dataItem.getSignatureData()
}

export function verify (dataItemBytes) {
  return DataItem.verify(dataItemBytes)
}
