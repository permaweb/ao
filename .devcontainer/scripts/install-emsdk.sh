INSTALL=$1
if [ "$INSTALL" = "true" ]; then
    git clone https://github.com/emscripten-core/emsdk.git /emsdk
    cd /emsdk
    git pull
    ./emsdk install ${EMSCRIPTEN_VERSION}
    ./emsdk activate ${EMSCRIPTEN_VERSION}
else
    echo "Skipping EMSDK Installation..."
fi
