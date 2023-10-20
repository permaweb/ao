/* global Deno */

import { Command } from '../deps.js'
import { tagsArg, walletArgs } from '../utils.js'
import { VERSION } from '../versions.js'

function sourceArgs (src) {
  return [
    '-e',
    `CONTRACT_SOURCE_TX=${src}`
  ]
}

/**
 * TODO:
 * - Validate existence of wallet
 * - require confirmation and bypass with --yes
 */
export async function process ({ wallet, tag, source }) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...sourceArgs(source),
    ...tagsArg(tag)
  ]

  const p = Deno.run({
    cmd: [
      'docker',
      'run',
      '--platform',
      'linux/amd64',
      ...cmdArgs,
      '-it',
      `p3rmaw3b/ao:${VERSION.IMAGE}`,
      'ao-contract'
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Create an ao Process using a published ao Source')
  .option(
    '-w, --wallet <path:string>',
    'the path to the wallet that should be used to sign the transaction',
    { required: true }
  )
  .option(
    '-s, --source <txId:string>',
    'the transaction that contains the contract source',
    { required: true }
  )
  .option(
    '-t, --tag <tag:string>',
    '"name:value" additional tag to add to the transaction',
    { collect: true }
  )
  .action(process)
