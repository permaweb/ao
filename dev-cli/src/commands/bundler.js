/* global Deno */

import { Command } from '../deps.js'
import { hostArgs, walletArgs } from '../utils.js'
import { VERSION } from '../versions.js'

function amountArgs (amount) {
  return [
    '-e',
    `BUNDLER_FUND_AMOUNT=${amount}`
  ]
}

export async function balance ({ wallet, host }) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...hostArgs(host)
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

export async function fund ({ wallet, host }, amount) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...hostArgs(host),
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
  .usage('-w ./wallet.json -b "https://node2.irys.xyz"')
  .option(
    '-w, --wallet <path:file>',
    'the path to the wallet that has funded the bundler',
    { required: true }
  )
  .option(
    '-b, --bundler <bundler:string>',
    'the url of the funded bundler you would like to balance check. Defaults to Irys Node 2'
  )
  .action(balance)

const Fund = new Command()
  .description('Fund the balance on a bundler with the specified amount of winston')
  .usage('-w ./wallet.json -h https://node2.irys.xyz 500000000000')
  .option(
    '-w, --wallet <path:file>',
    'the path to the wallet that will be used to fund the bundler',
    { required: true }
  )
  .option(
    '-b, --bundler <bundler:string>',
    'the url of the bundler you would like to fund. Defaults to Irys Node 2'
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
