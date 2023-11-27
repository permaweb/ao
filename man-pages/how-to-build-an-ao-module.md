# how to build an ao module

It is assumed that you've [Setup the dev cli](./how-to-setup-the-dev-cli.md) and [Created an AO module](./how-to-create-an-ao-module.md)

<!-- toc -->

- [Build the Lua](#build-the-lua)

<!-- tocstop -->

## Build the Lua

Build will take a Lua file as input and output a wasm file.  This is your process that will be deployed to Arweave.

Assuming your using the process created from `how to create an AO module`, you should be in the directory of your process created from `ao init my-process` which is `my-process`

```zsh
ao build
```

> **Docker**: If this is the first time using this command, docker will pull the latest `p3rmaw3b/ao` image.

You should now see a `process.wasm` file that can be uploaded to arweave.