# ao CLI

The `ao` cli enables developers to create, run, build, and publish
SmartWeaveContracts written in [Lua](https://www.lua.org/).

- Initialize a Lua SmartWeaveContract template
- Run Lua in a Repl or run your Lua SmartWeaveContract
- Compile your Lua SmartWeaveContract into WASM
- Publish your compiled WASM to the Permaweb

<!-- toc -->

- [Requirements](#requirements)
- [Usage](#usage)
  - [Initialize a new Project](#initialize-a-new-project)
  - [Run a Lua Repl](#run-a-lua-repl)
  - [Execute a Lua file](#execute-a-lua-file)
  - [Build Lua to Wasm](#build-lua-to-wasm)
  - [Publish Wasm to Permaweb](#publish-wasm-to-permaweb)
  - [Help](#help)
- [Testing example](#testing-example)
- [For Developers](#for-developers)

<!-- tocstop -->

## Requirements

Docker is required - docker is used to create/install the Lua runtime and
`emscripten` to compiled Lua into WASM.

Learn how to [Install Docker](https://www.docker.com/get-started/)

## Usage

- Download the `ao` cli install script for the CLI version you would like to
  install
- Once the CLI has been installed, follow the prompts to add the `ao` binary to
  your system `PATH`

### Where's the `ao` Install Script?

All the CLI binaries, as well as the install scripts, are published onto
Arweave. Until we use something more comprehensive to map versions, we simply
maintain a map of the `version -> txId` in the
[`deno.json manifest file`](./deno.json) of this project.

To find the relevant transaction that contains the install script for a
particular version of the `ao` CLI, check the `txMappings` in the
[`deno.json`](./deno.json) (you probably just want latest). Then to install that
CLI version, simply run:

```sh
curl -L https://arweave.net/{txId} | bash
```

Then follow the instructions for adding the `ao` binary to your `PATH`. Use
`ao --help` to confirm the CLI is installed

> If you're contributing to the `ao` CLI directly, you may want to install your
> locally built binaries out of the `dist` folder. You can run
> `deno task install-local` to install the binary from the built `dist` folder,
> for your platform.

### Initialize a new Project

```sh
ao init [myproject]
```

This will create a new directory, if needed, named `{myproject}`

### Run a Lua Repl

This gives you a Lua interpeter

```sh
ao repl
```

### Execute a Lua file

This is great for testing Lua modules

```sh
ao run [file.lua]
```

### Build Lua to Wasm

```sh
ao build
```

### Publish Wasm to Permaweb

```sh
ao publish [file.wasm] -w [wallet] -t [name:value] -t [name:value]
```

### Help

```sh
ao help
```

You can also run `ao [command] --help` for command-lvl help.

## Testing example

Once you have built your Lua into Wasm using `ao build`, the output will be a
`contract.js` and a `contract.wasm` file.

The `contract.js` file is the JS interop that allows invoking Wasm from a JS
program, while the `contract.wasm` is your Lua code compiled into Wasm.

## For Developers

This system is built using deno and compiled in to executable binaries, it
requires docker as the `ao` executable will need to externally invoke docker
commands to run lua and emscripten as well as build tools
