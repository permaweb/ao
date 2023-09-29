import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

import manifest from "../deno.json" assert { type: "json" };

import { init } from "./commands/init.js";
import { repl } from "./commands/repl.js";
import { build } from "./commands/build.js";
import { run } from "./commands/run.js";
import { publish } from "./commands/publish.js";
import { contract } from "./commands/contract.js";

await new Command()
  .name("ao")
  .version(manifest.version)
  .description("Create ao contracts")
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
  .command("publish", "publish the lua wasm to arweave")
  .option(
    "-w, --wallet <path:string>",
    "the path to the wallet that should be used to sign the transaction",
  )
  .option(
    "-t, --tag <tag:string>",
    '"name:value" additional tag to add to the transaction',
    { collect: true },
  )
  // TODO: expose bundlr node option?
  // .option('-n, --node <path:string>', 'the bundlr node that you would like to use to upload your built wasm contract')
  .arguments("<wasmfile:string>")
  .action(publish)
  // contract
  .command("contract", "create a contract using a published ao source")
  .option(
    "-w, --wallet <path:string>",
    "the path to the wallet that should be used to sign the transaction",
  )
  .option(
    "-t, --tag <tag:string>",
    '"name:value" additional tag to add to the transaction',
    { collect: true },
  )
  .option(
    "-s, --source <txId:string>",
    "the transaction that contains the contract source",
  )
  .arguments("<initialstate:string>")
  .action(contract)
  .parse(Deno.args);
