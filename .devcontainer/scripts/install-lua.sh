if [ "$INSTALL_LUA" = "true" ]; then
    # Install lua runtime
    cd / 
    curl -L http://www.lua.org/ftp/lua-${LUA_VERSION}.tar.gz | tar xzf - 
    cd /lua-${LUA_VERSION} 
    make linux test 
    make install

    # Install luarocks
    cd /
    curl -L https://luarocks.org/releases/luarocks-${LUAROCKS_VERSION}.tar.gz | tar xzf - 
    cd /luarocks-${LUAROCKS_VERSION}
    ./configure
    make build
    make install

    # And, re-compile lua with "generic WASM"
    cd /lua-${LUA_VERSION}
    make clean 
    make generic CC=${EMCC}
else
    echo "Skipping LUA Installation..."
fi


