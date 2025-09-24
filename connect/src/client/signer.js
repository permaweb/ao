import { Buffer as BufferShim } from 'buffer/index.js'
import base64url from 'base64url'
import { httpbis, createVerifier } from 'http-message-signatures'

import { parseItem, serializeList } from 'structured-headers'

import { createDataItemBytes, getSignatureData, verify } from '../lib/data-item.js'
import { httpSigName } from './hb.js'

import forge from "node-forge";
import { verifyMessage } from 'http-message-signatures/lib/httpbis/index.js'

const { augmentHeaders, createSignatureBase, createSigningParameters, formatSignatureBase } = httpbis

if (!globalThis.Buffer) globalThis.Buffer = BufferShim

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

      /**
       * Default the type and alg to be
       * - type: arweave
       * - alg: RSA PSS SHA256 (default for arweave signing)
       */
      // eslint-disable-next-line no-unused-vars
      const { publicKey, type = 1, alg = 'rsa-v1_5-sha256' } = injected

      const unsigned = createDataItemBytes(
        data,
        { type, publicKey: toView(publicKey) },
        { target, tags, anchor }
      )

      /**
       * What is actually signed is the DataItem
       * deephash, so stash the unsigned bytes,
       * and resolve the deepHash.
       *
       * When the signature is ultimately received,
       * we can add it to the unsigned bytes
       */
      resolveUnsigned(unsigned)
      const deepHash = await getSignatureData(unsigned)
      return deepHash
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

              const isValid = await verify(signedBytes)
              if (!isValid) throw new Error('Data Item signature is not valid')

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

    const create = (injected) => {
      createCalled = true

      /**
       * Default the type and alg to be
       * - type: arweave
       * - alg: RSA PSS SHA512 (default for arweave http signing)
       */
      // eslint-disable-next-line no-unused-vars
      let { publicKey, type = 1, alg = 'rsa-pss-sha512' } = injected

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
      const keyId = base64url.encode(publicKey)
      httpSig.publicKey = publicKey
      httpSig.alg = alg
      httpSig.keyId = keyId
      const signingParameters = createSigningParameters({
        params,
        paramValues: {
          keyid: keyId,
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
            .then(async (rawSig) => {
              const withSignature = augmentHeaders(
                request.headers,
                rawSig,
                httpSig.signatureInput,
                httpSigName(address)
              )

              const signedRequest = { ...request, headers: withSignature }

              if(!await verifySig(signedRequest)) {
                throw new Error("Request is not a valid httpsig request")
              }

              return signedRequest
            })
        })
      })
  }
}

async function verifySig({url, headers} = req) {
  return verifyMessage({
    all: true,
    // logic for finding a key based on the signature parameters
    async keyLookup(params) {
      if (params.alg == "hmac-sha256") {
        return {
            id: params.keyid,
            algs: ['hmac-sha256'],
            verify: createVerifier(params.keyid, 'hmac-sha256')
        }
      }
      if (params.alg == "rsa-pss-sha512") {
        const n = Buffer.from(params.keyid, 'base64');
        const pem = toPublicPem(n, 65537);
        return {
          id: params.keyid,
          algs: ['rsa-pss-sha512'],
          verify: createVerifier(pem, 'rsa-pss-sha512')
        }
      }
    },
  }, {
    method: 'GET',
    url: url,
    headers: headers
  });
}

function toPublicPem(nBuf, eInt = 65537) {
  const n = new forge.jsbn.BigInteger(nBuf.toString("hex"), 16);
  const e = new forge.jsbn.BigInteger(eInt.toString(), 10);
  const publicKey = forge.pki.rsa.setPublicKey(n, e);

  // PKCS#8
  return forge.pki.publicKeyToPem(publicKey);
}
