/* global Deno */

import { Command, basename, resolve, parse } from '../deps.js'
import { hostArgs, tagsArg } from '../utils.js'
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
  contractWasmPath = contractWasmPath || 'process.wasm'
  const contractName = basename(contractWasmPath)
  const contractWasmDest = `/src/${contractName}`

  const contractWasmSrc = resolve(contractWasmPath)

  return [
    // mount the wasm contract in pwd to /src
    '-v',
    `${contractWasmSrc}:${contractWasmDest}`,
    '-e',
    `MODULE_WASM_PATH=${contractWasmDest}`
  ]
}

/**
 * Retrieves the memory limit based on the configuration preset or custom memory limit.
 * @returns {string} The memory limit
 */
async function GetMemoryLimit () {
  let memoryLimit = '256-mb'

  const configPath = `${Deno.cwd()}/config.yml`
  let config = null
  try {
    config = parse(await Deno.readTextFile(configPath))
  } catch {
    return memoryLimit
  }

  if (config) {
    switch (config.preset) {
      case 'xs':
        memoryLimit = '64-mb'
        break
      case 'sm':
        memoryLimit = '128-mb'
        break
      case 'md':
        memoryLimit = '256-mb'
        break
      case 'lg':
        memoryLimit = '256-mb'
        break
      case 'xl':
        memoryLimit = '512-mb'
        break
      case 'xxl':
        memoryLimit = '4096-mb'
        break
      default:
        memoryLimit = '256-mb'
        break
    }
  }
  if (config?.memory_limit) {
    memoryLimit = `${config.memoryLimit}-b`
  }
  return memoryLimit
}

/**
 * TODO:
 * - Validate existence of wallet
 * - Validate existence of contract wasm
 * - allow using environment variables to set things like path to wallet
 * - require confirmation and bypass with --yes
 */
export async function publish ({ wallet, host, tag, value }, contractWasmPath) {
  tag.push('Memory-Limit')
  value.push(await GetMemoryLimit())
  const cmdArgs = [
    ...walletArgs(wallet),
    ...hostArgs(host),
    ...contractSourceArgs(contractWasmPath),
    ...tagsArg({ tags: tag, values: value })
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
      'ao-module'
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Publish the file to Arweave')
  .usage('-w ./wallet.json -b "https://up.arweave.net" --tag="Foo" --value="Bar" contract.wasm')
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
    'additional tag to add to the transaction. MUST have a corresponding --value',
    { collect: true }
  )
  .option(
    '-v, --value <value:string>',
    'value of the preceding tag name',
    { collect: true }
  )
  .arguments('<wasmfile:string>')
  .action(publish)
