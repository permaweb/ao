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
  - [Where's the `ao` Install Script?](#wheres-the-ao-install-script)
  - [Initialize a new Project](#initialize-a-new-project)
  - [Run a Lua Repl](#run-a-lua-repl)
  - [Execute a Lua file](#execute-a-lua-file)
  - [Build Lua to Wasm](#build-lua-to-wasm)
  - [Publish Wasm to Permaweb](#publish-wasm-to-permaweb)
  - [Help](#help)
- [Testing example](#testing-example)
- [For Developers](#for-developers)
  - [Contributing](#contributing)
  - [Publish a new Version of the CLI](#publish-a-new-version-of-the-cli)
    - [Need a to also Publish a new Docker Image version?](#need-a-to-also-publish-a-new-docker-image-version)

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

To install the latest version of the `ao` CLI, run:

```sh
curl -L https://install_ao.g8way.io | bash
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
ao lua
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
ao --help
```

You can also run `ao [command] --help` for command-lvl help.

## Testing example

Once you have built your Lua into Wasm using `ao build`, the output will be a
`process.js` and a `process.wasm` file.

The `process.js` file is the JS interop that allows invoking Wasm from a JS
program, while the `process.wasm` is your Lua code compiled into Wasm.

## For Developers

This system is built using deno and compiled in to executable binaries, it
requires docker as the `ao` executable will need to externally invoke docker
commands to run lua and emscripten as well as build tools.

### Contributing

You will still need `docker`. Learn how to
[Install Docker](https://www.docker.com/get-started/)

Run `deno task build-binaries` to compile the CLI binaries into the `dist`
folder. There are 4 binaries built:

- Windows
- Linux
- Mac ARM
- Mac x86_64

You can run `deno task install-local` to install the binary directly from the
`dist` folder, useful for local development on the CLI.

### Publish a new Version of the CLI

We use a Github workflow to build and publish new version of the CLI to Arweave.
To publish a new version, go to the
[`ao` CLI workflow](https://github.com/permaweb/ao/actions/workflows/dev-cli.yml)
and click the `Run Workflow` button. Provide the semver compatible version you
would like to bump to, and then click `Run Workflow`. This will trigger a
Workflow Dispatch that will:

- Check that the version is Semver
- Build the CLI binaries
- Publish the binaries to Arweave, via Irys Node 2
- Build the install script
- Publish the install script to Arweave, via Irys Node 2
- Update the `ArNS` for `https://install_ao.g8way.io` to point to the newest
  install script
- Update `version` and `txMappings` in `deno.json`
- `push` `deno.json` updates back to the remote repo

> Because the binaries are large, ~100MB for the combined 3, we have to fund a
> Irys Node in order to upload them to Arweave. The CLI uses a wallet,
> `lCA-1KVTuBxbUgUyeT_50tzrt1RZkiEpY-FFDcxmvps`, that has funded Irys Node 2
> with a very small amount of funds (`CI_WALLET` env variable). If the funds are
> depleted, then the CLI will no longer be able to publish the CLI to Arweave.
> For now, if the Irys Node needs more funding, contact `@TillaTheHun0`. (Maybe
> eventually we add a Workflow Dispatch script to automatically fund the Irys
> Node)

#### Need a to also Publish a new Docker Image version?

If you need to also publish a new Docker Image, you will currently need to do
this manually.

First login to DockerHub with the appropriate `p3rmaweb` credentials:
`docker login`. Then run `cd container && ./build.sh` to build the image. Tag
the image using `docker tag <image_id> p3rmaw3b/ao:<tag>`. Then finally, push to
DockerHub using `docker push p3rmaw3b/ao:<tag>`.

Once the docker image is published, update the `VERSION.IMAGE` value to the
corresponding version in `src/versions.js`, commit, and push.

Then run the CI as described in [Publish a new Version of the CLI](#publish-a-new-version-of-the-cli)
