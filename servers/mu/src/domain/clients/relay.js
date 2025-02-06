import { createPrivateKey, createHash} from 'node:crypto'
import { httpbis, createSigner } from 'http-message-signatures'

import { of, fromPromise } from 'hyper-async'

const { signMessage } = httpbis

function httpSigName (address) {
  // Decode the base64 address
  const decoded = Buffer.from(address, 'base64url');

  // Get the first 8 bytes
  const first8Bytes = decoded.subarray(1, 9);

  // Convert to hexadecimal
  const hexString = [...first8Bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');

  return `http-sig-${hexString}`;
}

export function topUpWith ({ fetch, logger, wallet, address }) {
  const privateKey = createPrivateKey({ key: wallet, format: 'jwk' })
  const s = createSigner(privateKey, 'rsa-pss-sha512', address)
  const params = ['alg', 'keyid'].sort()

  return async ({ logId, relayUrl, amount, recipient }) => {
    let relayUrlObj = new URL(relayUrl)
    const urlString = `${relayUrl}?amount=${amount}&recipient=${recipient}`

    const request = {
      url: new URL(urlString),
      method: 'POST',
      headers: {
        'amount': `${amount}`,
        'recipient': `${recipient}`,
        'path': relayUrlObj.pathname,
      }
    }
    
    const { method, headers } = await signMessage({
      key: s,
      fields: [
        ...Object.keys(request.headers)
      ].sort(),
      name: httpSigName(address),
      params
    }, request)
    
    return of()
      .map(logger.tap({ log: `Forwarding message to RELAY ${urlString}`, logId }))
      .chain(
        fromPromise(() =>
          fetch(
             urlString, { method, headers }
          ).then(async (_response) => {
            return { 
              request: { method, url: urlString, headers }
            }
          })
        )
      )
      .toPromise()
  }
}