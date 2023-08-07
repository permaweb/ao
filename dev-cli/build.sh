#!/bin/bash 

echo 'compiling for linux'
deno compile --allow-write --allow-run --output bin/linux-hb --target x86_64-unknown-linux-gnu src/mod.js

# echo 'compiling for mac'
deno compile --allow-write --allow-run --output bin/macos-arm-hb --target aarch64-apple-darwin src/mod.js

# echo 'compiling for windows'
deno compile --allow-write --allow-run --output hb.exe --target x86_64-pc-windows-msvc src/mod.js
zip bin/hyperbeam-windows.zip hb.exe
rm ./hb.exe

npm i -g arkb

arkb deploy bin --auto-confirm --wallet ../wallet.json --use-bundler https://node2.bundlr.network
