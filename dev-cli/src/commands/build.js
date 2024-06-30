/* global Deno */

import { Command } from '../deps.js'
import { VERSION } from '../versions.js'

export async function build ({ lang = 'lua' }) {
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
      'emcc-ao',
      `${lang === 'cpp' ? '-c' : ''}`
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Build the Lua Project into WASM')
  .usage('-l cpp')
  .option(
    '-l, --lang <language:string>',
    'The starter to use. Defaults to Lua. Options are "lua" and "cpp"'
  )
  .action(build)
