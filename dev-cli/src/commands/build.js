/* global Deno */

import { Command } from '../deps.js'
import { VERSION } from '../versions.js'

export async function build(customImage) {
  const pwd = Deno.cwd()
  const image = customImage || `p3rmaw3b/ao:${VERSION.IMAGE}`

  const p = Deno.run({
    cmd: [
      'docker',
      'run',
      '--platform',
      'linux/amd64',
      '-v',
      `${pwd}:/src`,
      image,
      'ao-build-module'
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Build the Lua Project into WASM')
  .option('-i, --image <image:string>', 'Specify a custom Docker image to use')
  .action(async (options) => {
    await build(options.image)
  })
