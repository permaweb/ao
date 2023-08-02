# HyperBEAM CLI

This is a developer cli that allows developers to create their lua scripts and run them in a lua repl, or exec them on a command line, compile them to wasm and publish them on the permaweb.

## Requirements

* Docker is required - docker is used to create/install lua runtime and emscripten in a cross-platform way

## Usage

- Download hyperbeam cli - `hb`
- Add to your system path

create a new project

```sh
hb init [myproject]
```

run the repl

```sh
hb repl
```

exec a lua file

```sh
hb exec [file.lua]
```

compile to wasm

```sh
hb compile [myproject]
```

publish to permaweb

```sh
hb publish [myproject] -w [wallet]
```

get help

```sh
hb help
```

## HyperBEAM Project Template

What does a project template look like?

```
- README.md
- definition.json
- main.lua
```

## For Developers

This system is built using deno and compiled in to executable binaries, it requires docker as the `hb` executable will need to externally invoke docker commands to run lua and emscripten as well as build tools