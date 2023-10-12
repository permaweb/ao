/* global Deno */

import { Command, basename, resolve } from '../deps.js'
import { hostArgs } from '../utils.js'
import { VERSION } from '../versions.js'

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

function contractSourceArgs (contractWasmPath) {
  /**
   * Use contract.wasm in pwd by default
   */
  contractWasmPath = contractWasmPath || 'contract.wasm'
  const contractName = basename(contractWasmPath)
  const contractWasmDest = `/src/${contractName}`

  const contractWasmSrc = resolve(contractWasmPath)

  return [
    // mount the wasm contract in pwd to /src
    '-v',
    `${contractWasmSrc}:${contractWasmDest}`,
    '-e',
    `CONTRACT_WASM_PATH=${contractWasmDest}`
  ]
}

function tagArg (tags) {
  return tags ? ['-e', `TAGS=${tags.join(',')}`] : []
}

/**
 * TODO:
 * - Validate existence of wallet
 * - Validate existence of contract wasm
 * - allow using environment variables to set things like path to wallet
 * - require confirmation and bypass with --yes
 */
export async function publish ({ wallet, host, tag }, contractWasmPath) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...hostArgs(host),
    ...contractSourceArgs(contractWasmPath),
    ...tagArg(tag)
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
      'ao-source'
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Publish the file to Arweave')
  .usage('-w ./wallet.json -b "https://node2.irys.xyz" -t "App-Name:Foo" -t "Type:Bar" contract.wasm')
  .option(
    '-w, --wallet <path:string>',
    'the path to the wallet that should be used to sign the transaction',
    { required: true }
  )
  .option(
    '-b, --bundler <bundler:string>',
    'the url of the bundler you would like to fund.'
  )
  .option(
    '-t, --tag <tag:string>',
    '"name:value" additional tag to add to the transaction',
    { collect: true }
  )
  .arguments('<wasmfile:string>')
  .action(publish)
