#!/usr/bin/bash
deno compile --allow-read --allow-write --output ./src/emcc-lua ./src/emcc-lua.js
docker build . -t p3rmaw3b/hyperbeam