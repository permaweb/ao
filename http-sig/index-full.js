import { createHash, createPrivateKey, createPublicKey } from 'node:crypto'
import { readFileSync } from 'node:fs'

import Arweave from 'arweave'
import { httpbis, createSigner, createVerifier } from 'http-message-signatures'

const { signMessage, verifyMessage } = httpbis
const arweave = Arweave.init()

const WASM = readFileSync('./test-64.wasm');

function generateHttpSigName(address) {
  // Decode the base64 address
  const decoded = Buffer.from(address, 'base64url');

  // Get the first 8 bytes
  const first8Bytes = decoded.subarray(1, 9);

  // Convert to hexadecimal
  const hexString = [...first8Bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');

  return `http-sig-${hexString}`;
}

/**
 * A signer that uses an arweave key
 * and rsa-pss-sha512 alg to sign the message.
 *
 * This also sets the wallet as the keyid in the signature params
 */
const verifiers = new Map()
const arweaveSigner = await arweave.wallets.generate()
  .then((jwk) => arweave.wallets.getAddress(jwk)
    .then(address => {
      return {
        address,
        privateKey: createPrivateKey({ key: jwk, format: 'jwk' }),
        publicKey: createPublicKey({ key: jwk, format: 'jwk' })
      };
    })
  )
  .then(({ address, privateKey, publicKey }) => {
    const signer = createSigner(privateKey, 'rsa-pss-sha512', address)
    const verifier = createVerifier(publicKey, 'rsa-pss-sha512')
    verifiers.set(address, { verify: verifier })
    return signer
  })

async function sign({ signer, request }) {
  return signMessage({
    key: signer,
    /**
     * Include all the fields in the signature,
     * plus the method and path
     */
    fields: [
      // '@method',
      // '@path',
      ...Object.keys(request.headers)
    ].sort(),
    /**
     * The name of the signature in the Signature and
     * Signature-Input dictionaries
     */
    name: generateHttpSigName(arweaveSigner.id),
    params: ['keyid', 'alg']
  }, request)
}

async function verify({ request }) {
  return verifyMessage({
    keyLookup: (params) => verifiers.get(params.keyid)
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
    url: new URL('http://47n6km7l-8080.use.devtunnels.ms/~message@1.0/verify'),
    headers: {
      'execution-device': 'wasm64@1.0',
      'scheduler-device': 'scheduler@1.0',
      'scheduler-location': 'J2UvMhi2G_I4YXhiWjhlJmFD0Oezci1NWiMXz0YYPS4',
      // '2.body|map': 'type=message, action=good',
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
});

console.log({ method, url, headers, body });

const response = await fetch(url, {
  method,
  headers,
  body
});

console.log('Response status:', response.status);
console.log('Response headers:', response.headers);

const responseBody = await response.text();
console.log('Response body:', responseBody);

/* Local Verification */
// const verified = await verify({
//   request: { method, url, headers, body }
// })

// console.log({ verified });
