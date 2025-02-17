import { Buffer } from 'buffer/index.js'
import base64url from 'base64url'
import { httpbis } from 'http-message-signatures'
import { parseItem, serializeList } from 'structured-headers'

import { createDataItemBytes } from '../lib/data-item.js'
import { httpSigName } from './hb.js'

const { augmentHeaders, createSignatureBase, createSigningParameters, formatSignatureBase } = httpbis

if (!globalThis.Buffer) globalThis.Buffer = Buffer

/**
 * Convert the value into a Uint8Array
 * @param {string | Uint8Array} value
 * @returns {globalThis.Buffer}
 */
const toView = (value) => {
  if (ArrayBuffer.isView(value)) value = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  else if (typeof value === 'string') value = base64url.toBuffer(value)
  else throw new Error('Unexpected type. Value must be one of Uint8Array, ArrayBuffer, or base64url-encoded string')
  return value
}

export const DATAITEM_SIGNER_KIND = 'ans104'
export const HTTP_SIGNER_KIND = 'httpsig'

export const toDataItemSigner = (signer) => {
  return async ({ data, tags, target, anchor }) => {
    let resolveUnsigned
    let createCalled
    /**
     * @type {Promise<Buffer>}
     */
    const dataToSign = new Promise((resolve) => { resolveUnsigned = resolve })

    /**
     * receive the signing public credentials and
     * extract what we need to construct the unsigned
     * data item
     */
    const create = async (injected) => {
      createCalled = true
      /**
       * If the signer wishes to receive the arguments
       * and skip serialization to a data item, they can provide this argument.
       *
       * This is useful for signers that internally serialize data items,
       * and drive UI off of the provided inputs ie. ArConnect
       */
      if (injected.passthrough) return { data, tags, target, anchor }

      const { publicKey, type } = injected

      const unsigned = createDataItemBytes(
        data,
        { type, publicKey: toView(publicKey) },
        { target, tags, anchor }
      )

      resolveUnsigned(unsigned)
      return unsigned
    }

    return signer(create, DATAITEM_SIGNER_KIND)
      .then((res) => {
        /**
         * Ensure create was called in order to produce the signature
         */
        if (!createCalled) {
          throw new Error('create() must be invoked in order to construct the data to sign')
        }

        /**
         * The signer has done the work
         */
        if (typeof res === 'object' && res.id && res.raw) return res
        if (!res.signature || !res.signature) {
          throw new Error('signer must return its signature and address')
        }

        const { signature } = res
        return dataToSign.then((unsigned) => {
          return Promise.resolve(signature)
            .then(toView)
            .then(async (rawSig) => {
              /**
               * Add signature to the data item in the proper
               * position: after the first 2 bytes reserved for signature type
               */
              const signedBytes = unsigned
              signedBytes.set(rawSig, 2)

              return {
                /**
                 * A data item's ID is the base64url encoded
                 * SHA-256 of the signature
                 */
                id: await crypto.subtle.digest('SHA-256', rawSig)
                  .then(raw => base64url.encode(raw)),
                raw: signedBytes
              }
            })
        })
      })
  }
}

export const toHttpSigner = (signer) => {
  const params = ['alg', 'keyid'].sort()

  return async ({ request, fields }) => {
    let resolveUnsigned
    let createCalled

    const httpSig = {}
    /**
     * @type {Promise<Buffer>}
     */
    const dataToSign = new Promise((resolve) => { resolveUnsigned = resolve })
      /**
       * receive the signing public credentials and
       * extract what we need to construct the unsigned
       * data item
       */
      .then()

    const create = ({ publicKey, alg, type }) => {
      createCalled = true

      /**
       * TODO: do we need to check signature type
       * and only allow supported keys?
       *
       * For now allowing through, and letting HyperBEAM
       * handle
       */
      // const meta = lookupSignatureMeta(type)
      // if (meta.type !== 1) {
      //   throw new Error('HTTP Signed Messages currently can only be signed using Arweave keys')
      // }
      // if (meta.pubLength !== publicKey.byteLength) {
      //   throw new Error('HTTP Signed Messages public does not match expected length')
      // }

      publicKey = toView(publicKey)

      const signingParameters = createSigningParameters({
        params,
        paramValues: {
          keyid: base64url.encode(publicKey),
          alg
        }
      })
      const signatureBase = createSignatureBase({ fields }, request)
      const signatureInput = serializeList([
        [signatureBase.map(([item]) => parseItem(item)), signingParameters]
      ])
      signatureBase.push(['"@signature-params"', [signatureInput]])
      const base = formatSignatureBase(signatureBase)

      httpSig.signatureInput = signatureInput
      httpSig.signatureBase = base

      const encoded = new TextEncoder().encode(base)
      resolveUnsigned(encoded)
      return encoded
    }

    return signer(create, HTTP_SIGNER_KIND)
      .then((res) => {
        if (!res.signature || !res.signature) {
          throw new Error('signer must return its signature and address')
        }

        const { signature, address } = res
        /**
         * Ensure create was called in order to produce the signature
         */
        if (!createCalled) {
          throw new Error('create() must be invoked in order to construct the data to sign')
        }

        return dataToSign.then(() => {
          return Promise.resolve(signature)
            .then(toView)
            .then((rawSig) => {
              const withSignature = augmentHeaders(
                request.headers,
                rawSig,
                httpSig.signatureInput,
                httpSigName(address)
              )
              return { ...request, headers: withSignature }
            })
        })
      })
  }
}
