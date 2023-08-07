FROM emscripten/emsdk:3.1.14
LABEL maintainer "tom wilson <tom@hyper.io>"

RUN apt-get update -qq -y
RUN apt-get install -y curl vim make gcc libreadline6-dev libssl-dev zlib1g-dev zip unzip

ENV LUA_VERSION 5.3.4
ENV LUAROCKS_VERSION 2.4.4

# install deno
RUN curl -fsSL https://deno.land/x/install/install.sh | sh
RUN echo 'export DENO_INSTALL="/root/.deno"' >> $HOME/.bashrc
RUN echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> $HOME/.bashrc

# install lua runtime
RUN cd / && \
  curl -L http://www.lua.org/ftp/lua-${LUA_VERSION}.tar.gz | tar xzf - && \
  cd /lua-${LUA_VERSION} && \
  make linux test && \
  make install

# Install luarocks
RUN cd / && \
  curl -L https://luarocks.org/releases/luarocks-${LUAROCKS_VERSION}.tar.gz | tar xzf - && \
  cd /luarocks-${LUAROCKS_VERSION} && \
  ./configure && \
  make build && \
  make install

# And, re-compile lua with "generic WASM"
RUN cd /lua-${LUA_VERSION} && \
  make clean && \
  make generic CC='emcc -s WASM=1'


RUN luarocks install LuaFileSystem
# Install commands
COPY ./src/emcc-lua /usr/local/bin/emcc-lua
# COPY ./src/emcc_lua_lib /usr/local/emcc-lua/emcc_lua_lib
COPY ./src/pack.lua /opt/pack.lua
COPY ./src/main.c /opt/main.c
COPY ./src/main.lua /opt/main.lua
# RUN chmod +x /usr/local/bin/emcc-lua

# ENV CC 'emcc -s WASM=1'
# ENV NM 'llvm-nm'