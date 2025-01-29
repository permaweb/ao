import { createHash, createPrivateKey } from 'node:crypto'
import { readFileSync } from 'node:fs'

import Arweave from 'arweave'
import { httpbis, createSigner } from 'http-message-signatures'

const { signMessage } = httpbis
const arweave = Arweave.init()

const WASM = readFileSync('./test-64.wasm')

/**
 * A signer that uses an arweave key
 * and rsa-pss-sha512 alg to sign the message.
 *
 * This also sets the wallet as the keyid in the signature params
 */
const arweaveSigner = await arweave.wallets.generate()
  .then((jwk) => arweave.wallets.getAddress(jwk)
    .then(address => ({ address, pk: createPrivateKey({ key: jwk, format: 'jwk' }) }))
  )
  .then(({ address, pk }) => createSigner(pk, 'rsa-pss-sha512', address))

async function sign ({ signer, request }) {
  return signMessage({
    key: signer,
    /**
     * Include all the fields in the signature,
     * plus the method and path
     */
    fields: [
      '@method',
      '@path',
      ...Object.keys(request.headers)
    ].sort(),
    /**
     * The name of the signature in the Signature and
     * Signature-Input dictionaries
     */
    name: 'my-sig',
    params: ['keyid', 'alg']
  }, request)
}

/**
 * Signature and Signature-Input headers have been appended
 * to with the new signature and signature params.
 *
 * Pass these to fetch or preferred http client
 */
const { method, url, headers, body } = await sign({
  signer: arweaveSigner,
  request: {
    method: 'POST',
    url: new URL('http://localhost:8080/~process@1.0/schedule'),
    headers: {
      'execution-device': 'wasm64@1.0',
      'scheduler-device': 'scheduler@1.0',
      'scheduler-location': 'J2UvMhi2G_I4YXhiWjhlJmFD0Oezci1NWiMXz0YYPS4',
      '2.body|map': 'type=process',
      /**
       * See https://datatracker.ietf.org/doc/html/rfc9530#name-the-content-digest-field
       * for content-digest structure
       * and https://datatracker.ietf.org/doc/html/rfc8941#name-byte-sequences for
       * structured field syntax
       */
      'content-digest': `sha-256=:${createHash('sha256').update(WASM).digest('base64')}:`
    },
    body: WASM
  }
})

console.log({ method, url, headers, body })
