import { readFileSync } from 'node:fs'

import { WarpFactory, defaultCacheOptions } from 'warp-contracts'
import Arweave from 'arweave'
import { z } from 'zod'

function env (key) {
  const res = z.string().min(1).safeParse(process.env[key])
  if (!res.success) {
    console.error(`Error with ENV VAR: ${key}`)
    throw res.error
  }
  return res.data
}

/**
 * Add U Tags in order to Mint U as part of CI
 */
// const U_TAGS = [
//   { name: 'App-Name', value: 'SmartWeaveAction' },
//   { name: 'App-Version', value: '0.3.0' },
//   { name: 'Input', value: JSON.stringify({ function: 'mint' }) },
//   { name: 'Contract', value: 'KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw' }
// ]

const actions = {
  async UPDATE_ARNS () {
    const WALLET = env('WALLET')
    const INSTALL_SCRIPT_ID = env('INSTALL_SCRIPT_ID')

    const jwk = JSON.parse(readFileSync(WALLET))

    /**
     * The install_ao ANT Contract
     * See https://sonar.warp.cc/?#/app/contract/uOf4TMgQxdaSXgcZ778PZR13UQPKJoZVK2ZvLAE90Xg?network=mainnet%23
     */
    const ANT = 'uOf4TMgQxdaSXgcZ778PZR13UQPKJoZVK2ZvLAE90Xg'

    const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' })
    const warp = WarpFactory.custom(arweave, defaultCacheOptions, 'mainnet').useArweaveGateway().build()

    // Update the ao ANT Contract to point to the new install script
    const aoAntContract = warp.contract(ANT).connect(jwk)
    const antUpdate = await aoAntContract.writeInteraction({
      function: 'setRecord',
      subDomain: 'install',
      transactionId: INSTALL_SCRIPT_ID
    })

    console.log('Updated ao ANT record', antUpdate.interactionTx)

    return INSTALL_SCRIPT_ID
  }
}

const ACTION = env('ACTION')
if (!actions[ACTION]) throw new Error(`'${ACTION}' is not a valid action`)

actions[ACTION]().catch(console.error)
