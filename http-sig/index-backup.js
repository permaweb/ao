import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Arweave from 'arweave';
import { httpbis, createSigner } from 'http-message-signatures';
import { encode as base64Encode } from 'base64-arraybuffer';

const { signMessage, verifyMessage } = httpbis;
const arweave = Arweave.init();

const WASM = readFileSync('./test-64.wasm');
const ENDPOINT = 'https://hb-app-265030051442.us-east1.run.app/~message@1.0/verify';

const initHeaders = {
  '@method': 'POST',
  '@path': '/~message@1.0/verify',
  'execution-device': 'wasm64@1.0',
  'scheduler-device': 'scheduler@1.0',
  'scheduler-location': 'J2UvMhi2G_I4YXhiWjhlJmFD0Oezci1NWiMXz0YYPS4',
  '2.body|map': 'type=process',
  // 'content-digest': `sha-256=:${createHash('sha256').update(WASM).digest('base64')}:`
};

const fields = [
  '@method',
  '@path',
  // 'content-digest',
  'execution-device',
  'scheduler-device',
  'scheduler-location',
  '2.body|map'
]
/**
 * Generate Arweave wallet and convert it into an RSA-PSS-SHA512 signer
 */
// const arweaveSigner = await arweave.wallets.generate()
//   .then((jwk) => arweave.wallets.getAddress(jwk)
//     .then(address => ({
//       address,
//       pk: createPrivateKey({ key: jwk, format: 'jwk' }),
//       pubKey: createPublicKey({ key: jwk, format: 'jwk' })
//     }))
//   )
//   .then(({ address, pk, pubKey }) => {
//     const pubKeyBase64 = base64Encode(pubKey.export({ type: 'spki', format: 'der' }));

//     console.log('Generated Arweave Wallet');
//     console.log('Address:', address);
//     console.log('Public Key (Base64):', pubKeyBase64);

//     return {
//       signer: createSigner(pk, 'rsa-pss-sha512', address),
//       pubKeyBase64
//     };
//   });

const arweaveSigner = await arweave.wallets.generate()
  .then((jwk) => arweave.wallets.getAddress(jwk)
    .then(address => ({
      address,
      pk: createPrivateKey({ key: jwk, format: 'jwk' }),
      pubKey: createPublicKey({ key: jwk, format: 'jwk' })
    }))
  )
  .then(({ address, pk, pubKey }) => {
    return {
      signer: createSigner(pk, 'rsa-pss-sha512', address),
      pubKeyJWK: pubKey.export({ format: 'jwk' }) // Store as JWK
    };
  });

async function importCryptoKey(jwk) {
  try {
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-PSS',
        hash: { name: 'SHA-512' },
      },
      true,
      ['verify']
    );

    return publicKey;
  } catch (error) {
    console.error("CryptoKey Import Error:", error);
    throw error;
  }
}

const keys = new Map();
const keyId = arweaveSigner.signer.id || 'generated-key-id';

console.log('\nSetting Up Key Lookup:');
console.log('Key ID:', keyId);

keys.set(keyId, {
  id: keyId,
  alg: 'rsa-pss-sha512',
  async verify(data, signature) {

    // console.log('-----------------------------')
    // console.log('Signature Parameters Used for Verification:')
    // console.log(parameters);
    // console.log('-----------------------------')

    console.log('Verifying Signature...');
    console.log('Data to be verified (UTF-8)');
    console.log(Buffer.from(data).toString('utf-8'));
    console.log('\nSignature (Base64):', Buffer.from(signature).toString('base64'));
    console.log((signature))

    try {
      const publicKey = await importCryptoKey(arweaveSigner.pubKeyJWK);
      const verified = await crypto.subtle.verify(
        {
          name: 'RSA-PSS',
          saltLength: 64
        },
        publicKey,
        signature,
        data
      );

      console.log('\nSignature Verification Result:', verified);
      return verified;
    } catch (error) {
      console.error('Verification Failed:', error);
      return false;
    }
  },
});

async function sign({ signer, request }) {
  const signedRequest = await signMessage({
    key: signer,
    fields: fields,
    name: 'my-sig',
    params: ['keyid', 'alg'],
    signingOptions: {
      saltLength: 64
    }
  }, request);

  console.log('\nSigned Request');
  console.log('Method:', signedRequest.method);
  console.log('URL:', signedRequest.url.toString());
  console.log('Headers:', JSON.stringify(signedRequest.headers, null, 2));
  console.log('\nSignature:', signedRequest.headers['Signature']);
  console.log('\n');

  return signedRequest;
}

/* Sign the request */
const { method, url, headers, body } = await sign({
  signer: arweaveSigner.signer,
  request: {
    method: 'POST',
    url: new URL(ENDPOINT),
    headers: initHeaders,
    // body: WASM
  }
});

/* Verify the message */
try {
  const verified = await verifyMessage({
    async keyLookup(params) {
      if (!keys.has(params.keyid)) {
        console.error(`Key Not Found: ${params.keyid}`);
        throw new Error(`Key not found: ${params.keyid}`);
      }
      return keys.get(params.keyid);
    },
  }, {
    method,
    url,
    headers,
    body
  });

  console.log('\nLocal Verification Result:', verified);
} catch (err) {
  console.error('\nLocal Verification Failed:', err);
}

// console.log('Signed Request:', { method, url, headers, body });

// const verificationPayload = {
//   'signature': headers['Signature'],
//   'signature-input': headers['Signature-Input'],
//   'signature-public-key': arweaveSigner.pubKeyBase64,
//   'signature-device': 'HTTP-Sig@1.0',
//   'headers': {
//     ...initHeaders,
//     'signature': headers['Signature'],
//     'signature-input': headers['Signature-Input']
//   }
// };

// console.log('Verification Payload:', verificationPayload);

// console.log(keys)

// /**
//  * Execute Local Verification
//  */
// await verifySignature({
//   method,
//   url,
//   headers
// });
