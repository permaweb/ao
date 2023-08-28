#!/bin/bash

# Build the hyperbeam cli into a set of platform binaries

# change directory to root of dev-cli to ensure this script works no matter where it is ran
cd "$(dirname "$0")/.."

OUTPUT_DIR="dist"

deno compile --allow-write --allow-run --output "${OUTPUT_DIR}/hb" --target x86_64-unknown-linux-gnu src/mod.js
zip -j "${OUTPUT_DIR}/hyperbeam-x86_64-unknown-linux-gnu.zip" "${OUTPUT_DIR}/hb"
rm "${OUTPUT_DIR}/hb"

deno compile --allow-write --allow-run --output "${OUTPUT_DIR}/hb" --target aarch64-apple-darwin src/mod.js
zip -j "${OUTPUT_DIR}/hyperbeam-aarch64-apple-darwin.zip" "${OUTPUT_DIR}/hb"
rm "${OUTPUT_DIR}/hb"

deno compile --allow-write --allow-run --output "${OUTPUT_DIR}/hb".exe --target x86_64-pc-windows-msvc src/mod.js
zip -j "${OUTPUT_DIR}/hyperbeam-x86_64-pc-windows-msvc.exe.zip" "${OUTPUT_DIR}/hb.exe"
rm "${OUTPUT_DIR}/hb".exe

#  stdout, so can be piped or saved to a variable
echo "$(pwd)/${OUTPUT_DIR}"
