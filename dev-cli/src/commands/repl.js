/* global Deno */

import { Command } from '../deps.js'
import { VERSION } from '../versions.js'

export async function repl () {
  const pwd = Deno.cwd()
  const p = Deno.run({
    cmd: [
      'docker',
      'run',
      '--platform',
      'linux/amd64',
      '-v',
      `${pwd}:/src`,
      '-it',
      `p3rmaw3b/ao:${VERSION.IMAGE}`,
      'lua'
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Start a Lua Repl')
  .action(repl)
