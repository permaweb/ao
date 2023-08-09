import { Command } from 'https://deno.land/x/cliffy@v1.0.0-rc.2/command/mod.ts'
import { init } from './commands/init.js'
import { repl } from './commands/repl.js'
import { build } from './commands/build.js'
import { run } from './commands/run.js'

await new Command()
  .name('hyperbeam')
  .version('0.0.2')
  .description('Create Hyperbeam contracts')
  // init
  .command("init", "create project")
  .arguments("<name:string>")
  .action(init)
  // repl
  .command("repl", "run a lua repl")
  .action(repl)
  // run 
  .command("run", "run a lua file")
  .arguments("<file:string>")
  .action(run)
  // build
  .command("build", "build the lua wasm")
  .action(build)
  // publish
  .command("publish", "publish to arweave")
  .action(_ => console.log("TODO: publish"))
  .parse(Deno.args)
