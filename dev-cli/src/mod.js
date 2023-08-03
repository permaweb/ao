import { Command } from 'https://deno.land/x/cliffy@v1.0.0-rc.2/command/mod.ts'

await new Command()
  .name('hyperbeam')
  .version('0.0.1')
  .description('Create Hyperbeam contracts')
  // init
  .command("init", "create project")
  .arguments("<name:string>")
  .action(_ => console.log("TODO: init project"))
  // repl
  .command("repl", "run a lua repl")
  .action(_ => console.log("TODO: repl"))
  // run 
  .command("run", "run a lua file")
  .arguments("<file:string>")
  .action(_ => console.log("TODO: run lua"))
  // compile
  .command("compile", "build the lua wasm")
  .action(_ => console.log("TODO: build"))
  // publish
  .command("publish", "publish to arweave")
  .action(_ => console.log("TODO: publish"))
  .parse(Deno.args)
