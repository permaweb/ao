import { createPrivateKey, createHash, webcrypto} from 'node:crypto'
import { httpbis, createSigner } from 'http-message-signatures'

import { of, fromPromise } from 'hyper-async'

const { signMessage, verifyMessage } = httpbis

function base64urlDecodeUTF8 (base64url) {
  const binary = atob(base64url.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array([...binary].map(char => char.charCodeAt(0)))
  return new TextDecoder().decode(bytes)
}

function httpSigName (address) {
  const decoded = Buffer.from(base64urlDecodeUTF8(address))
  const hexString = [...decoded.subarray(1, 9)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  return `http-sig-${hexString}`
}

async function importJWK(jwk) {
  return await crypto.subtle.importKey(
      'jwk', 
      jwk, 
      { name: 'RSA-PSS', hash: 'SHA-512' }, 
      true, 
      ['verify']
  );
}

export function topUpWith ({ fetch, logger, wallet }) {
  const publicKey = wallet.n
  const privateKey = createPrivateKey({ key: wallet, format: 'jwk' })
  const address = createHash('sha256')
    .update(Buffer.from(publicKey, 'base64url'))
    .digest('base64url')

  const s = createSigner(privateKey, 'rsa-pss-sha512', publicKey)
  const params = ['alg', 'keyid'].sort()

  return async ({ logId, relayUrl, amount, recipient }) => {
    const url = `${relayUrl}?amount=${amount}&recipient=${recipient}`

    const request = {
      url,
      method: 'POST'
    }
    
    const { headers: signedHeaders } = await signMessage({
      key: s,
      fields: [
        '@path',
        '@query-param;name=amount',
        '@query-param;name=recipient',
      ].sort(),
      name: httpSigName(address),
      params
    }, request)

    console.log(signedHeaders)

    // const publicKey = await importJWK(wallet);

    // **Verify the signature before sending**
    // const verificationResult = await verifyMessage(
    //   {
    //     async keyLookup(params) {
    //       return {
    //         id: 'o6XW5KwfPKOia7eUJVPEigyWHkDcq1TTTH6OS4085U_OeKnZ1xMABSuPmu5gO2Pi7Ju23fh86FtErLRkeJIQOmB-Hfk-GeQ8qQlH8f_71xTeh8nPIEfmOIxJT2xtfDtAHO66mKTGPywgC5ie0GZP7_aJ6k5kqZ9hfYQN3GhiGfXN2p535Q_mwkM27m89RcilR7YtznM5u4VlsKQiC4awMTxamkJ8VOSa7deXsDtNOAJqI9SSKjXmQAWFC9OYspO6_YmxZEkPE2vmnsEhZTFkeMGobr_NuTl4eBYb2BoG4_3_Slr-2RNX78b1qeQN46NIq6975--5XYFbHPld7ezgLF_F-0qPUkBsboY7JIJRxxFnF-QGmEJQ-EIIbiMowYhvFJBY710zDFZ_MXk8TCWkrkx3iIo4n880OIZrKney9ZyQaBoC07dEcnrx2tGgwSjhV-m3NJdSoz97P17RdPB0OVBM5N_Nis5vJq9I3IUPgwCzjoCVDHgT82xZzHogXE-wBgB_S8yZDx8kudaJyvZ6fNqgkUpLCvyOFeBwMyIKColEHqrsskVCx7T8gG2z2moy6tCBzn7PzWeAwIpSU-YkQMNzvS0GI5zJFJGRp252-NN_uvYLE0elk1hBy2STn-3ZN9uGacmkvHnYblHp9jwyB9fLFqz0GbD8Jao2fihf1_M',
    //         alg: 'rsa-pss-sha512',
    //         async verify(data, signature, parameters) {
    //           const publicKey = await importJWK(wallet); // ✅ Ensure correct key
    //           return crypto.subtle.verify(
    //             { name: 'RSA-PSS', saltLength: 32 },
    //             publicKey,
    //             signature,
    //             data
    //           );
    //         },
    //       };
    //     },
    //   },
    //   { ...request, headers: signedHeaders }
    // );

    // console.log(verificationResult)

    // if (!verificationResult) {
    //   throw new Error('Signature verification failed. Aborting request.');
    // }

    return of()
      .map(logger.tap({ log: `Forwarding message to RELAY ${url}`, logId }))
      .chain(
        fromPromise(() =>
          fetch(
            url, 
            { 
              method: 'POST',
              headers: signedHeaders 
            }
          ).then(async (response) => {
            return response
          })
        )
      )
      .toPromise()
  }
}