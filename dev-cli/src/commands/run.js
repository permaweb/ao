/* global Deno */

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
      'p3rmaw3b/ao',
      'lua',
      f
    ]
  })
  await p.status()
}
