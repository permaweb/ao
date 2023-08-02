FROM emscripten/emsdk:3.1.14
LABEL maintainer "tom wilson <tom@hyper.io>"

RUN apt-get update -qq -y
RUN apt-get install curl vim make gcc libreadline6-dev libssl-dev zlib1g-dev zip unzip

ENV LUA_VERSION 5.3.4
ENV LUAROCKS_VERSION 2.4.4

# install deno


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

