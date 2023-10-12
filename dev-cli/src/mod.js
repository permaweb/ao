/* global Deno */

import { Command } from './deps.js'

import { VERSION } from './versions.js'

import { command as Init } from './commands/init.js'
import { command as Repl } from './commands/repl.js'
import { command as Run } from './commands/run.js'
import { command as Build } from './commands/build.js'
import { command as Publish } from './commands/publish.js'
import { command as Contract } from './commands/contract.js'
import { command as Bundler } from './commands/bundler.js'

const cli = new Command()
  .name('ao')
  .version(VERSION.CLI)
  .description('The ao CLI for building and publishing ao Processes')
  .action(() => cli.showHelp())
  .command('init', Init)
  .command('repl', Repl)
  .command('run', Run)
  .command('build', Build)
  .command('publish', Publish)
  .command('contract', Contract)
  .command('bundler', Bundler)

await cli.parse(Deno.args)
