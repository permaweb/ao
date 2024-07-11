FROM mcr.microsoft.com/devcontainers/base:jammy

# ----- ARGS ----- #
ARG INSTALL_LUA
ARG INSTALL_NODE
ARG INSTALL_RUST
ARG INSTALL_PYTHON
ARG INSTALL_EMSDK
ARG INSTALL_DENO

ARG LUA_VERSION
ARG LUAROCKS_VERSION
ARG EMSCRIPTEN_VERSION
ARG RUST_VERSION
ARG NODE_VERSION
ARG PYTHON_VERSION
ARG PYTHON_PIP_VERSION

# ------ ENV VARS ------ #
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo
ENV NVM_DIR=/usr/local/.nvm
ENV DENO_INSTALL=/usr/local/.deno

ENV LANG=C.UTF-8
ENV GPG_KEY=E3FF2839C048B25C084DEBE9B26995E310250568
ENV PYTHON_SETUPTOOLS_VERSION=58.1.0
ENV PYTHON_GET_PIP_URL=https://github.com/pypa/get-pip/raw/e03e1607ad60522cf34a92e834138eb89f57667c/public/get-pip.py
ENV PYTHON_GET_PIP_SHA256=ee09098395e42eb1f82ef4acb231a767a6ae85504a9cf9983223df0a7cbd35d7

# ------ UPDATE PATH ------ #
ENV PATH=/usr/local/cargo/bin:$PATH
ENV PATH=$PATH:/emsdk:/emsdk/upstream/emscripten
ENV PATH=$PATH:/scripts
ENV PATH=$PATH:$DENO_INSTALL/bin

# ----- SCRIPTS ----- #
COPY scripts /scripts
RUN chmod +x /scripts/*

# ----- Update And Install Tools ------ #
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get -y install --no-install-recommends \
    sudo git curl vim make cmake gcc zip unzip \
    build-essential cppcheck valgrind lldb llvm gdb

# ----- Python ----- #
RUN sh /scripts/install-python.sh

# ----- DENO ----- #
RUN sh /scripts/install-deno.sh
 
# ----- RUST ----- #
RUN sh /scripts/install-rust.sh 

# ------ EMSDK ------ #
RUN sh /scripts/install-emsdk.sh

# ------ LUA ------ #
RUN sh /scripts/install-lua.sh

# ------ NVM & NODE ------ #
RUN sh /scripts/install-node.sh

ENV CC='emcc -s WASM=1'
ENV NM='llvm-nm'

ENV DEBIAN_FRONTEND=dialog
