#!/bin/bash

# Build the ao cli into a set of platform binaries

# change directory to root of dev-cli to ensure this script works no matter where it is ran
cd "$(dirname "$0")/.."

OUTPUT_DIR="dist"

rm -f "${OUTPUT_DIR}/ao-*.zip"

deno compile --allow-read --allow-write --allow-run --output "${OUTPUT_DIR}/ao" --target x86_64-unknown-linux-gnu src/mod.js
zip -j "${OUTPUT_DIR}/ao-x86_64-unknown-linux-gnu.zip" "${OUTPUT_DIR}/ao"
rm "${OUTPUT_DIR}/ao"

deno compile --allow-read --allow-write --allow-run --output "${OUTPUT_DIR}/ao" --target aarch64-apple-darwin src/mod.js
zip -j "${OUTPUT_DIR}/ao-aarch64-apple-darwin.zip" "${OUTPUT_DIR}/ao"
rm "${OUTPUT_DIR}/ao"

deno compile --allow-read --allow-write --allow-run --output "${OUTPUT_DIR}/ao" --target x86_64-apple-darwin src/mod.js
zip -j "${OUTPUT_DIR}/ao-x86_64-apple-darwin.zip" "${OUTPUT_DIR}/ao"
rm "${OUTPUT_DIR}/ao"

deno compile --allow-read --allow-write --allow-run --output "${OUTPUT_DIR}/ao".exe --target x86_64-pc-windows-msvc src/mod.js
zip -j "${OUTPUT_DIR}/ao-x86_64-pc-windows-msvc.exe.zip" "${OUTPUT_DIR}/ao.exe"
rm "${OUTPUT_DIR}/ao.exe"

#  stdout, so can be piped or saved to a variable
echo "$(pwd)/${OUTPUT_DIR}"
