import { createPrivateKey } from 'node:crypto'
import { httpbis, createSigner } from 'http-message-signatures'

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

export function topUpWith ({ fetch, logger, wallet, address, fetchTransactions }) {
  const privateKey = createPrivateKey({ key: wallet, format: 'jwk' })
  const s = createSigner(privateKey, 'rsa-pss-sha512', address)
  const params = ['alg', 'keyid'].sort()

  return async ({ logId, relayUrls, amount, recipientProcessId }) => {
    if(relayUrls.length < 1) {
      return new Error('No relay urls configured for this currency.', { cause: {} })
    }

    if(!relayUrls[0].url) {
      return new Error('Relay urls improperly configured for this currency.', { cause: {} })
    }

    let processInfo = await fetchTransactions([recipientProcessId])
    let recipient = processInfo?.data?.transactions?.edges?.length >= 1 ? processInfo.data.transactions.edges[0].node.owner.address : null
    
    if(!recipient) {
      return new Error("Invalid recipient for top up")
    }

    for (const relay of relayUrls) {
      let relayUrlObj = new URL(relay["url"])
      const urlString = `${relay["url"]}?amount+integer=${amount}&recipient=${recipient}`

      logger({ log: `Forwarding to relay: ${urlString}`, logId })

      const request = {
        url: new URL(urlString),
        method: 'POST',
        headers: {
          'amount+integer': `${amount}`,
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
  
      try {
        await fetch( urlString, { method, headers } )
        return { request: { method, url: urlString, headers } }
      } catch(e) {
        continue
      }
    }

    return new Error('All relay urls failed.', { cause: {} })
  }
}