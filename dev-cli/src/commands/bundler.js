/* global Deno */

import { Command } from '../deps.js'
import { bundlerArgs, walletArgs } from '../utils.js'
import { VERSION } from '../versions.js'

function amountArgs (amount) {
  return [
    '-e',
    `BUNDLER_FUND_AMOUNT=${amount}`
  ]
}

export async function balance ({ wallet, bundler }) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...bundlerArgs(bundler)
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
      'ao-bundler-balance'
    ]
  })
  await p.status()
}

export async function fund ({ wallet, bundler }, amount) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...bundlerArgs(bundler),
    ...amountArgs(amount)
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
      'ao-bundler-fund'
    ]
  })
  await p.status()
}

const Balance = new Command()
  .description('Check the balance on a bundler')
  .usage('-w ./wallet.json -b "https://up.arweave.net"')
  .option(
    '-w, --wallet <path:file>',
    'the path to the wallet that has funded the bundler',
    { required: true }
  )
  .option(
    '-b, --bundler <bundler:string>',
    'the url of the funded bundler you would like to balance check. Defaults to https://up.arweave.net'
  )
  .action(balance)

const Fund = new Command()
  .description('Fund the balance on a bundler with the specified amount of winston')
  .usage('-w ./wallet.json -b "https://up.arweave.net" 500000000000')
  .option(
    '-w, --wallet <path:file>',
    'the path to the wallet that will be used to fund the bundler',
    { required: true }
  )
  .option(
    '-b, --bundler <bundler:string>',
    'the url of the bundler you would like to fund. Defaults to https://up.arweave.net'
  )
  .arguments(
    '<amount:integer>',
    "The amount in winston you'd like to fund the bundler"
  )
  .action(fund)

export const command = new Command()
  .name('bundler')
  .description('ao CLI Bundler commands')
  .action(() => command.showHelp())
  .command('balance', Balance)
  .command('fund', Fund)
