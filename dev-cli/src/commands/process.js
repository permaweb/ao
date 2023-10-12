/* global Deno */

import { Command } from '../deps.js'
import { tagsArg, walletArgs } from '../utils.js'

function sourceArgs (src) {
  return [
    '-e',
    `CONTRACT_SOURCE_TX=${src}`
  ]
}

/**
 * TODO:
 * - Validate existence of wallet
 * - allow using environment variables to set things like path to wallet
 * - require confirmation and bypass with --yes
 */
export async function process ({ wallet, tag, source }) {
  const cmdArgs = [
    ...sourceArgs(source),
    ...walletArgs(wallet),
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
      'p3rmaw3b/ao',
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
    'the transaction that contains the process source',
    { required: true }
  )
  .option(
    '-t, --tag <tag:string>',
    '"name:value" additional tag to add to the transaction',
    { collect: true }
  )
  // TODO: do we need to allow passing data to set as the DataItem data?
  .action(process)
