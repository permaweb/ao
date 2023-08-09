# HyperBEAM CLI

This is a developer cli that allows developers to create their lua scripts and
run them in a lua repl, or exec them on a command line, compile them to wasm and
publish them on the permaweb.

## Requirements

- Docker is required - docker is used to create/install lua runtime and
  emscripten in a cross-platform way

## Usage

- Download hyperbeam cli - `hb`
- Add to your system path

create a new project

```sh
hb init [myproject]
```

run the repl - this gives you an lua interpeter

```sh
hb repl
```

exec a lua file - this is great for testing

```sh
hb run [file.lua]
```

build to wasm

```sh
hb build
```

publish to permaweb - not implemented

```sh
hb publish [myproject] -w [wallet] -t [name:value] -t [name:value]
```

get help

```sh
hb help
```

## Testing example

Once you have built your wasm, you get a `contract.js` and a `contract.wasm`
file

## For Developers

This system is built using deno and compiled in to executable binaries, it
requires docker as the `hb` executable will need to externally invoke docker
commands to run lua and emscripten as well as build tools
