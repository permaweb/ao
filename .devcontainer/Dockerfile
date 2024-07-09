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

# ------ ENV VARS ------ #
ENV CC='emcc -s WASM=1'
ENV NM='llvm-nm'
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo
ENV NVM_DIR=/usr/local/.nvm

# ------ UPDATE PATH ------ #
ENV PATH=/usr/local/cargo/bin:$PATH
ENV PATH=$PATH:/emsdk:/emsdk/upstream/emscripten
ENV PATH=$PATH:/scripts

# ----- SCRIPTS ----- #
COPY scripts /scripts
RUN chmod +x /scripts/*

# ----- Update And Install Tools ------ #
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get -y install --no-install-recommends sudo git curl vim make cmake gcc zip unzip

# ----- Install Other Packages ----- #
RUN apt-get -y install --no-install-recommends \
    cppcheck valgrind clang lldb llvm gdb \
    build-essential libreadline6-dev libssl-dev zlib1g-dev libpq5 \
    llvm-dev libclang-dev librocksdb-dev

# ----- Python ----- #
RUN sh /scripts/install-python.sh ${INSTALL_PYTHON}

# ----- DENO ----- #
RUN sh /scripts/install-python.sh ${INSTALL_DENO}
 
# ----- RUST ----- #
RUN sh /scripts/install-rust.sh ${INSTALL_RUST} ${RUST_VERSION} ${RUSTUP_HOME} ${CARGO_HOME}

# ------ EMSDK ------ #
RUN sh /scripts/install-emsdk.sh ${INSTALL_EMSDK}

# ------ LUA ------ #
RUN sh /scripts/install-lua.sh ${INSTALL_LUA} ${LUA_VERSION} ${LUAROCKS_VERSION}

# ------ NVM & NODE ------ #
RUN sh /scripts/install-node.sh ${INSTALL_NODE} ${NVM_DIR} ${NODE_VERSION}

ENV DEBIAN_FRONTEND=dialog
