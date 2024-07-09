# `ao` Development Container

This is a dev container for vs code that allows user to spin up a quick development environment in docker.

<!-- toc -->

- [Prerequisites](#prerequisites)
- [Usage](#usage)
- [Configuration](#environment-variables)
- [System Requirements](#recommended-system-requirements)


<!-- tocstop -->

## Prerequisites

You will need [VS Code](https://code.visualstudio.com/) and the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension. 

You will need [Node](https://nodejs.org/en) installed to generate wallets. 

You will need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed to host the dev container. 

## Usage

You will need a `.env` file. A full example is provided in `.env.example`.

Generate the wallets for the SU, MU, and CU:
```sh
./generateALL.sh # Will generate a wallet.json in ./services/su/, ./services/mu/, and ./services/cu
```

> [!WARNING]  
> Windows users make sure to run ./generateALL.sh using `Git Bash`.

> [!NOTE]
> If you don't want to use the default configurations for the SU, MU, and CU.
> You can update there respective .env files in ./services/{SERVICE}/.env.{SERVICE}
> If you change any of the SU postgres configuration you will need to update the su-db service in the docker-compose.yaml.

## Configuration

- `INSTALL_LUA`: whether or not to install Lua. (Defaults to `false`)
- `INSTALL_PYTHON`: whether or not to install Python. (Defaults to `true`)
- `INSTALL_EMSDK`: whether or not to install EMSDK (Emscripten). (Defaults to `false`)
- `INSTALL_RUST`: whether or not to install Rust. (Defaults to `false`)
- `INSTALL_NODE`: whether or not to install Node. (Defaults to `true`)
- `INSTALL_DENO`: whether or not to install DENO. (Defaults to `true`)

- `LUA_VERSION`: version of Lua to be install. (Defaults to `5.3.4`)
- `LUAROCKS_VERSION`: version of LuaRocks to be install. (Defaults to `2.4.4`)
- `EMSCRIPTEN_VERSION`: version of Emscripten to be install. (Defaults to `3.1.59`)
- `RUST_VERSION`: version of rust to be install. (Defaults to `1.79.0`)
- `NODE_VERSION`: version of node to be install. (Defaults to `22.4.1`)

## Recommended System Requirements

- `OS`: Windows 10, Windows 11, Linux, Mac
- `Processor`: 64-bit processor with at least 4 cores.
- `Memory`: 8 GB RAM.
- `Storage`: 4 GB available space.