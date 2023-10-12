/* global Deno */

import { Command, basename, resolve } from '../deps.js'

function walletArgs (wallet) {
  /**
   * Use wallet in pwd by default
   */
  wallet = wallet || 'wallet.json'
  const walletName = basename(wallet)
  const walletDest = `/src/${walletName}`

  const walletSrc = resolve(wallet)

  return [
    // mount the wallet to file in /src
    '-v',
    `${walletSrc}:${walletDest}`,
    '-e',
    `WALLET_PATH=${walletDest}`
  ]
}

function tagArg (tags) {
  return tags ? ['-e', `TAGS=${tags.join(',')}`] : []
}

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
 * - allow using environment variables to set things like path to wallet
 * - require confirmation and bypass with --yes
 */
export async function process ({ wallet, tag, source }, initialState) {
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
  .description('Create an ao Process using a published ao Source')
  .option(
    '-w, --wallet <path:string>',
    'the path to the wallet that should be used to sign the transaction'
  )
  .option(
    '-t, --tag <tag:string>',
    '"name:value" additional tag to add to the transaction',
    { collect: true }
  )
  .option(
    '-s, --source <txId:string>',
    'the transaction that contains the process source'
  )
  .arguments('<initialstate:string>')
  .action(process)
