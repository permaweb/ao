import { Command } from "./deps.js"

import manifest from "../deno.json" assert { type: "json" }

import { command as Init } from "./commands/init.js"
import { command as Repl } from "./commands/repl.js"
import { command as Run } from "./commands/run.js"
import { command as Build } from "./commands/build.js"
import { command as Publish } from "./commands/publish.js"
import { command as Contract } from './commands/contract.js'

const cli = new Command()
  .name("ao")
  .version(manifest.version)
  .description("The ao CLI for building and publishing ao Processes")
  .action(() => cli.showHelp())
  .command("init", Init)
  .command("repl", Repl)
  .command("run", Run)
  .command("build", Build)
  .command("publish", Publish)
  .command("contract", Contract)

await cli.parse(Deno.args)
