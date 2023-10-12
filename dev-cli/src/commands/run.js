/* global Deno */

import { Command } from '../deps.js'
import { VERSION } from '../versions.js'

export async function run (_, f) {
  const pwd = Deno.cwd()
  const p = Deno.run({
    cmd: [
      'docker',
      'run',
      '--platform',
      'linux/amd64',
      '-v',
      `${pwd}:/src`,
      '-a',
      'stdout',
      '-a',
      'stderr',
      `p3rmaw3b/ao:${VERSION.IMAGE}`,
      'lua',
      f
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Run a Lua File')
  .arguments('<file:string>')
  .action(run)
