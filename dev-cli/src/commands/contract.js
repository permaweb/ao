/* global Deno */

import { Command } from '../deps.js'
import { tagArg, walletArgs } from '../utils.js'

function sourceArgs (src) {
  return [
    '-e',
    `CONTRACT_SOURCE_TX=${src}`
  ]
}

function stateArgs (initialStateStr) {
  try {
    JSON.parse(initialStateStr)
    return [
      '-e',
      `INITIAL_STATE=${initialStateStr}`
    ]
  } catch {
    throw new Error('initial state must be valid json')
  }
}

/**
 * TODO:
 * - Validate existence of wallet
 * - require confirmation and bypass with --yes
 */
export async function contract ({ wallet, tag, source }, initialState) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...tagArg(tag),
    ...sourceArgs(source),
    ...stateArgs(initialState)
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
  .description('<DEPRECATED> Use the process command for ao Processes\nCreate an ao Contract using a published ao Source')
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
  .arguments('<initialstate:string>')
  .action(process)
