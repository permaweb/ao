/* global Deno */

import { Command } from '../deps.js'
import { VERSION } from '../versions.js'

export async function exec (_, command) {
  const pwd = Deno.cwd()
  const p = Deno.run({
    cmd: [
      'docker',
      'run',
      '--platform',
      'linux/amd64',
      '-v',
      `${pwd}:/src`,
      `p3rmaw3b/ao:${VERSION.IMAGE}`,
      command
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Exec command in the container ( ie: exec emcmake cmake . )')
  .arguments('<command:string>')
  .action(exec)
