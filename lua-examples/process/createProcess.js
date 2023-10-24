import { readFileSync } from 'node:fs'
/**
 * This scrupt uses the local SDK build, so make sure to run `npm run build` in '/sdk'
 */
import { createProcess, createDataItemSigner } from '../../sdk/dist/index.js'

/**
 * Use this script to create new ao processes using the published wasm from contract.wasm
 *
 * Some are already published: z6_SOQUrnlCc51AvkmF4jh_N3i18cRI3-eCLfG3lAEw
 */

const CONTRACT_SRC = 'Isk_GYo30Tyf5nLbVI6zEJIfFpiXQJd58IKcIkTu4no'
const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

const tags = [
  { name: 'owner', value: 'lCA-1KVTuBxbUgUyeT_50tzrt1RZkiEpY-FFDcxmvps' },
  { name: 'inbox', value: JSON.stringify([]) },
  { name: 'prompt', value: ':) ' },
  { name: '_fns', value: JSON.stringify({}) }
]

await createProcess({
  srcId: CONTRACT_SRC,
  tags,
  signer: createDataItemSigner(wallet)
}).then(console.log)
  .catch(console.error)
