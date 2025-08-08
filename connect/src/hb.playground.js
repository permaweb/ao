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

  const mode = {
    hyperbeam: true,
    local: false
  }
  const doMsg = true
  const doSchedule = false

  const isHyperBeam = mode.hyperbeam
  const isLocal = mode.local
  const VARIANT = isHyperBeam ? 'ao.N.1' : 'ao.TN.1'
  const SCHEDULER = isHyperBeam
    ? isLocal
      ? 'mW0CxacCCO4UkzPIsaRRNwSutAsUW9rSbZSYVMN7nRE' // https://humbly-rational-cardinal.ngrok-free.app
      : 'NoZH3pueH0Cih6zjSNu_KRAcmg4ZJV1aGHKi0Pi5_Hc' // https://scheduler.forward.computer
    : '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA' // https://su-router.forward.computer
  const MU_URL = isLocal ? 'http://localhost:3004' : 'https://mu203.ao-testnet.xyz'
  const HB_URL = isLocal ? 'http://localhost:8734' : 'https://scheduler.forward.computer'
  describe('HyperBEAM mode', () => {
    test('should relay the message through HyperBEAM', async () => {
      const wallet = JSON.parse(readFileSync(tmpWallet).toString())
      // Spawn process using legacy MU

      const { message, spawn } = connect({
        MODE: 'legacy',
        MU_URL
      })
      const spawnedPid = await spawn({
        signer: createDataItemSigner(wallet),
        tags: [
          { name: 'Authority', value: 'fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY' },
          { name: 'Variant', value: VARIANT },
          { name: 'TagData', value: 'Foo' }
        ],
        module: 'ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s',
        scheduler: SCHEDULER
      })
      console.log({ spawnedPid })
      if (!doMsg) return

      console.log({ m: 'waiting 4 seconds for gateway to index process' })
      await new Promise(resolve => setTimeout(resolve, 4000))

      const msg1 = await message({
        process: spawnedPid,
        signer: createDataItemSigner(wallet),
        tags: [
          { name: 'Variant', value: VARIANT },
          { name: 'Type', value: 'Message' },
          { name: 'Action', value: 'Eval' },
          { name: 'MsgNum', value: '1' }
        ],
        data: 'ao.send({ Target = ao.id, Data = "Resultant Message1" })'
      }).catch(e => {
        console.log('Msg1 failed', { e })
      })
      console.log({ msg1 })

      const msg2 = await message({
        process: spawnedPid,
        signer: createDataItemSigner(wallet),
        tags: [
          { name: 'Variant', value: VARIANT },
          { name: 'Type', value: 'Message' },
          { name: 'Action', value: 'Eval' },
          { name: 'MsgNum', value: '2' }
        ],
        data: 'ao.send({ Target = ao.id, Data = "Resultant Message2" })'
      }).catch(e => {
        console.log('Msg2 failed', { e })
      })
      console.log({ msg2 })

      const msg3 = await message({
        process: spawnedPid,
        signer: createDataItemSigner(wallet),
        tags: [
          { name: 'Variant', value: VARIANT },
          { name: 'Type', value: 'Message' },
          { name: 'Action', value: 'Eval' },
          { name: 'MsgNum', value: '3' }
        ],
        data: 'ao.send({ Target = ao.id, Data = "Resultant Message3" })'
      }).catch(e => {
        console.log('Msg3 failed', { e })
      })
      console.log({ msg3 })

      if (!doSchedule) return
      if (isHyperBeam) {
        const getScheduleUrl = `${HB_URL}/~scheduler@1.0/schedule&target=${spawnedPid}/assignments/format~hyperbuddy@1.0`
        console.log({ getScheduleUrl })
        const schedule = await fetch(
          getScheduleUrl
        ).then(res => res.text()).catch(e => {
          console.log('Schedule failed', { e })
        })
        console.log({ schedule })
      }
    })
  })
})
