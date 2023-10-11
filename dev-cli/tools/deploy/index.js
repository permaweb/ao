import { Buffer } from 'node:buffer'

import Irys from '@irys/sdk'
import { WarpFactory, defaultCacheOptions } from 'warp-contracts'
import Arweave from 'arweave'
import { z } from 'zod'

console.log(process.env)

function env (key) {
  const res = z.string().min(1).safeParse(process.env[key])
  if (!res.success) {
    console.error(`Error with ENV VAR: ${key}`)
    throw res.error
  }
  return res.data
}

/**
 * The wallet is encoded in base64, so we must load the base64
 * into a buffer, then parse it to a utf-8 string, that can then
 * be further parsed into the JSON JWK Interface
 */
function parseWallet (wallet64) {
  return JSON.parse(Buffer.from(wallet64, 'base64').toString('utf-8'))
}

/**
 * Add U Tags in order to Mint U as part of CI
 */
const U_TAGS = [
  { name: 'App-Name', value: 'SmartWeaveAction' },
  { name: 'App-Version', value: '0.3.0' },
  { name: 'Input', value: JSON.stringify({ function: 'mint' }) },
  { name: 'Contract', value: 'KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw' }
]

const actions = {
  async UPLOAD_BINARIES () {
    const DEPLOY_FOLDER = env('BINARIES_OUTPUT_DIR')
    const IRYS_NODE = env('IRYS_NODE')
    const WALLET_64 = env('CI_WALLET')

    const jwk = parseWallet(WALLET_64)
    const irys = new Irys({ url: IRYS_NODE, token: 'arweave', key: jwk })

    const res = await irys.uploadFolder(DEPLOY_FOLDER, {
      manifestTags: U_TAGS,
      itemOptions: { tags: U_TAGS }
    })

    return res.id
  },
  async UPLOAD_INSTALL_SCRIPT () {
    const IRYS_NODE = env('IRYS_NODE')
    const WALLET_64 = env('CI_WALLET')
    const INSTALL_SCRIPT = env('INSTALL_SCRIPT')

    const jwk = parseWallet(WALLET_64)

    /**
     * The install_ao ANT Contract
     * See https://sonar.warp.cc/?#/app/contract/uOf4TMgQxdaSXgcZ778PZR13UQPKJoZVK2ZvLAE90Xg?network=mainnet%23
     */
    const ANT = 'uOf4TMgQxdaSXgcZ778PZR13UQPKJoZVK2ZvLAE90Xg'

    const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' })
    const irys = new Irys({ url: IRYS_NODE, token: 'arweave', key: jwk })
    const warp = WarpFactory.custom(arweave, defaultCacheOptions, 'mainnet').useArweaveGateway().build()

    // Upload the install script
    const res = await irys.uploadFile(INSTALL_SCRIPT, { tags: U_TAGS })

    // Update the ao ANT Contract to point to the new install script
    const aoAntContract = warp.contract(ANT).connect(jwk)
    const antUpdate = await aoAntContract.writeInteraction({
      function: 'setRecord',
      subDomain: 'install',
      transactionId: res.id
    })

    console.log('Updated ao ANT record', antUpdate.interactionTx)

    return res.id
  }
}

const ACTION = env('ACTION')
if (!actions[ACTION]) throw new Error(`'${ACTION}' is not a valid action`)

// For capturing in std-out
actions[ACTION]().then(id => {
  console.log(`Uploaded to https://arweave.net/${id}`)
}).catch(console.error)
