import { describe, test, before } from 'node:test'
import * as assert from 'node:assert'
import { tmpdir } from 'node:os'
import { writeFileSync, readFileSync } from 'node:fs'
import { createPublicKey, randomBytes } from 'node:crypto'
import { join } from 'node:path'

import Arweave from 'arweave'
import * as WarpArBundles from 'warp-arbundles'
import { createVerifier, httpbis } from 'http-message-signatures'

import { createDataItemBytes } from '../../lib/data-item.js'
import { createSigner } from './wallet.js'
import { toDataItemSigner, toHttpSigner } from '../signer.js'

/**
 * hack to get module resolution working on node jfc
 */
const pkg = WarpArBundles.default ? WarpArBundles.default : WarpArBundles
const { DataItem } = pkg

const { verifyMessage } = httpbis

describe('node - wallet', () => {
  /**
   * Generate a wallet in a temporary directory prior to running the tests
   */
  let tmpWallet
  before(async () => {
    const arweave = Arweave.init()

    tmpWallet = join(tmpdir(), `${randomBytes(16).toString('hex')}.json`)
    writeFileSync(
      tmpWallet,
      JSON.stringify(await arweave.wallets.generate())
    )
  })

  describe('createDataItemSigner', () => {
    test('should create and sign the data item with Arweave signer', async () => {
      const wallet = JSON.parse(readFileSync(tmpWallet).toString())
      const pubKey = Buffer.from(wallet.n, 'base64url')

      const signDataItem = createSigner(wallet)

      const res = await signDataItem(async ({ publicKey, type }) => {
        assert.equal(type, 1)
        assert.ok(pubKey.equals(publicKey))

        return createDataItemBytes('foobar', { type, publicKey }, {
          tags: [{ name: 'foo', value: 'bar' }],
          target: 'xwOgX-MmqN5_-Ny_zNu2A8o-PnTGsoRb_3FrtiMAkuw',
          anchor: randomBytes(32)
        })
      })

      assert.ok(res)
    })

    test('should create a valid signed data item', async () => {
      const wallet = JSON.parse(readFileSync(tmpWallet).toString())
      const signer = toDataItemSigner(createSigner(wallet))

      const res = await signer({
        data: 'foo',
        tags: [
          { name: 'foo', value: 'bar' }
        ],
        target: 'xwOgX-MmqN5_-Ny_zNu2A8o-PnTGsoRb_3FrtiMAkuw',
        anchor: randomBytes(32)
      })

      assert.ok(res.id)
      assert.ok(res.raw)

      const isValid = await DataItem.verify(res.raw)
      assert.ok(isValid)
    })

    test('should create a valid signed http message', async () => {
      const wallet = JSON.parse(readFileSync(tmpWallet).toString())
      const signer = toHttpSigner(createSigner(wallet))

      const req = await signer({
        request: {
          url: 'http://foo.bar/hello/world',
          method: 'GET',
          headers: {
            foo: 'bar',
            fizz: 'buzz'
          }
        },
        fields: [
          'foo',
          'fizz',
          '@path'
        ].sort()
      })

      const headers = new Headers(req.headers)
      assert.ok(headers.has('signature'))
      assert.ok(headers.has('signature-input'))

      const verifier = createVerifier(createPublicKey({ key: wallet, format: 'jwk' }), 'rsa-pss-sha512')
      const isValid = await verifyMessage({
        keyLookup: (params) => {
          assert.equal(params.keyid, wallet.n)
          assert.equal(params.alg, 'rsa-pss-sha512')

          return { verify: verifier }
        }
      }, req)

      assert.ok(isValid)
    })
  })
})
