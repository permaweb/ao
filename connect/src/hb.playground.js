/* eslint-disable no-unused-vars */
import { describe, test, before } from 'node:test'
// import * as assert from 'node:assert'
import { tmpdir } from 'node:os'
import { writeFileSync, readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

import Arweave from 'arweave'
import { connect, createSigner } from './index.js'

describe('hb playground', () => {
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

  describe('HyperBEAM mode', () => {
    test('should relay the message through HyperBEAM', async () => {
      const pid = 'C1YcmYARIs5Tjx5CVqM1TH62IBxust8TfhtfHng8DI0'
      const tags = [
        { name: 'Action', value: 'Info' }
      ]
      const wallet = JSON.parse(readFileSync(tmpWallet).toString())
      const { dryrun: legacyDryrun } = connect({
        MODE: 'legacy',
        GATEWAY_URL: 'https://arweave.net/graphql',
        URL: 'http://localhost:8734'
      })

      const legacyDryrunRes = await legacyDryrun({
        tags,
        process: '7GoQfmSOct_aUOWKM4xbKGg6DzAmOgdKwg8Kf-CbHm4',
        data: '1+15',
        foo: 'bar'
      })
      console.log({ legacyDryrunRes })
      const { dryrun } = connect({
        MODE: 'mainnet',
        device: 'process@1.0',
        signer: createSigner(wallet),
        GATEWAY_URL: 'https://arweave.net/graphql',
        URL: 'http://localhost:8734'
      })

      // const resultPath = `/${pid}~process@1.0/compute/serialize~json@1.0`
      // const resultParams = {
      //   type: 'Message',
      //   path: resultPath,
      //   method: 'POST',
      //   ...tags.filter(t => t.name !== 'device').reduce((a, t) => assoc(t.name, t.value, a), {}),
      //   data: '1+15',
      //   'data-protocol': 'ao',
      //   variant: 'ao.N.1',
      //   target: pid,
      //   "accept-bundle": "true",
      //   "accept-codec": "httpsig@1.0",
      //   signingFormat: 'ANS-104',
      // }
      // const resultRes = await request(resultParams).then((res) => JSON.parse(res.body))
      // console.dir(resultRes, { depth: null, colors: true })

      const dryrunRes = await dryrun({
        tags,
        process: pid,
        data: '1+15',
        foo: 'bar',
        signingFormat: 'ANS-104'
      })
      console.log({ dryrunRes })
    })
  })
})
