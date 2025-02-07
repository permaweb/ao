import { createPrivateKey, createPublicKey } from 'node:crypto'
import { httpbis, createSigner, createVerifier } from 'http-message-signatures'
import Arweave from 'arweave'
import { describe, it } from 'node:test'

import { topUpWith } from './relay.js'

const { verifyMessage } = httpbis
const arweave = Arweave.init()
const verifiers = new Map()

let { wallet, address } = await arweave.wallets.generate()
  .then((jwk) => arweave.wallets.getAddress(jwk)
    .then(address => {
      return {
        address,
        privateKey: createPrivateKey({ key: jwk, format: 'jwk' }),
        publicKey: createPublicKey({ key: jwk, format: 'jwk' }),
        jwk
      };
    })
  )
  .then(({ address, publicKey, jwk }) => {
    const verifier = createVerifier(publicKey, 'rsa-pss-sha512')
    verifiers.set(address, { verify: verifier })
    return { wallet: jwk, address }
  })

describe('topUpWith function', function () {
  let fetch = async (_url, options) => ({ ok: true, status: 200, json: async () => ({ success: true }), ...options })
  const logger = () => undefined
  logger.tap = () => (args) => {
    return args
  }
  const fetchTransactions = async () => {
    return {
      data: {
        transactions: {
          edges: [
            {
              node: {
                owner: {
                  address: "asdf"
                }
              }
            }
          ]
        }
      }
    }
  }
  let topUp = topUpWith({ fetch, logger, wallet, address, fetchTransactions })

  it('should correctly sign and verify a request', async function () {
    const params = {
      logId: 'test-log',
      relayUrl: 'https://relay1.example/path/topup',
      amount: 100,
      recipient: 'recipient-process-id'
    }

    const result = await topUp(params)
    
    const { request } = result
    
    const verified = await verifyMessage({
      keyLookup: (params) => {
        return verifiers.get(params.keyid)
      }
    }, request)
    
    if (!verified) {
      throw new Error('Signature verification failed')
    }
  })
})
