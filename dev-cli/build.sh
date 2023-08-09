#!/bin/bash 

echo 'compiling for linux'
deno compile --allow-write --allow-run --output bin/hb --target x86_64-unknown-linux-gnu src/mod.js
cd bin
zip hyperbeam-linux.zip hb
rm hb
cd ..

# echo 'compiling for mac'
deno compile --allow-write --allow-run --output bin/hb --target aarch64-apple-darwin src/mod.js
cd bin
zip hyperbeam-mac.zip hb
rm hb
cd ..

# echo 'compiling for windows'
deno compile --allow-write --allow-run --output bin/hb.exe --target x86_64-pc-windows-msvc src/mod.js
cd bin
zip hyperbeam-windows.zip hb.exe
rm hb.exe
cd ..

# npm i -g arkb

# arkb deploy bin --auto-confirm --wallet ../wallet.json --use-bundler https://node2.bundlr.network
