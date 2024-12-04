/* global Deno */

import { Command } from '../deps.js'
import { VERSION } from '../versions.js'

export async function build () {
  console.log(`Building the module using ao tool version ${VERSION.CLI}, docker image version: ${VERSION.IMAGE}`);
  const pwd = Deno.cwd()
  const cmd = [
    'docker',
    'run',
    '--platform',
    'linux/amd64',
    '-v',
    `${pwd}:/src`,
    '--env', 
    'DEBUG=True',
    `p3rmaw3b/ao:${VERSION.IMAGE}`,
    'ao-build-module'
  ];
  console.log(`Docker cmd: ${cmd}`);
  const p = Deno.run({
    cmd,
    // stdout: "piped",
    // stderr: "piped"
  })

  await p.status()

  // const output = await p.output() // "piped" must be set
  // const outStr = new TextDecoder().decode(output);
  // console.log('Build run stdout', outStr);

  // const error = await p.stderrOutput();
  // const errorStr = new TextDecoder().decode(error); 
  // console.log('Build run stderr', errorStr);
}

export const command = new Command()
  .description('Build the Lua Project into WASM')
  .action(build)
