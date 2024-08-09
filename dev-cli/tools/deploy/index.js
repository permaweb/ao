import { readFileSync } from 'node:fs'

import { ANT, ArweaveSigner } from '@ar.io/sdk'
import { z } from 'zod'

function env (key) {
  const res = z.string().min(1).safeParse(process.env[key])
  if (!res.success) {
    console.error(`Error with ENV VAR: ${key}`)
    throw res.error
  }
  return res.data
}

const actions = {
  async UPDATE_ARNS () {
    const WALLET = env('WALLET')
    const INSTALL_SCRIPT_ID = env('INSTALL_SCRIPT_ID')

    const jwk = JSON.parse(readFileSync(WALLET))

    /**
     * The install_ao ANT Contract
     * See https://sonar.warp.cc/?#/app/contract/uOf4TMgQxdaSXgcZ778PZR13UQPKJoZVK2ZvLAE90Xg?network=mainnet%23
     */
    // const ANT = 'uOf4TMgQxdaSXgcZ778PZR13UQPKJoZVK2ZvLAE90Xg'
    const ANT_PROCESS = 'YFbfeqZMbPVGFjQ-PHJY-Y99JQu7O3Jdet06pJnD5iI'

    const signer = new ArweaveSigner(jwk)
    const ant = ANT.init({ processId: ANT_PROCESS, signer })

    await ant
      .setRecord({
        undername: 'install',
        transactionId: INSTALL_SCRIPT_ID,
        ttlSeconds: 3600
      })
      .then((res) => console.log(`Updated install_ao ANT record to "${INSTALL_SCRIPT_ID}". Message Id: "${res.id}"`))

    return INSTALL_SCRIPT_ID
  }
}

const ACTION = env('ACTION')
if (!actions[ACTION]) throw new Error(`'${ACTION}' is not a valid action`)

actions[ACTION]().catch(console.error)
