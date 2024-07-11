if [ "$INSTALL_EMSDK" = "true" ]; then
    apt-get -y install --no-install-recommends llvm-dev libclang-dev librocksdb-dev clang
    git clone https://github.com/emscripten-core/emsdk.git /emsdk
    cd /emsdk
    git pull
    ./emsdk install ${EMSCRIPTEN_VERSION}
    ./emsdk activate ${EMSCRIPTEN_VERSION}
else
    echo "Skipping EMSDK Installation..."
fi
