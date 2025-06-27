/* eslint-disable no-unused-vars */
import { describe, test, before } from 'node:test'
// import * as assert from 'node:assert'
import { tmpdir } from 'node:os'
import { writeFileSync, readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

import Arweave from 'arweave'
import { tap } from 'ramda'

import { connect, createDataItemSigner } from './index.js'

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
      const wallet = JSON.parse(readFileSync(tmpWallet).toString())

      const { message } = connect({
        MODE: 'legacy',
        MU_URL: 'http://localhost:3004'
      })

      const msg1 = await message({
        process: 'oQHqnr9IZkrA6ENrgVy9QYMlpDUixCHqN5Gl_FjpFj0',
        signer: createDataItemSigner(wallet),
        tags: [
          { name: 'Variant', value: 'ao.N.1' },
          { name: 'Type', value: 'Message' },
          { name: 'Action', value: 'Foo' },
          { name: 'TagData', value: 'Foo' }
        ],
        data: 'ao.send({ Target = ao.id, Data = "Resultant Message" })'
      })

      console.log({ msg1 })
    })
  })
})
