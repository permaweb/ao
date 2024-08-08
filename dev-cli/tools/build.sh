#!/bin/bash

# Build the ao cli into a set of platform binaries

# change directory to root of dev-cli to ensure this script works no matter where it is ran
root_dir="$(dirname "$0")/.."
cd $root_dir

OUTPUT_DIR="${root_dir}/dist"

mkdir -p ${OUTPUT_DIR}

rm -f "${OUTPUT_DIR}/ao-*.zip"

cd src/starters/ && zip -rxv "${OUTPUT_DIR}/starters.zip" ./* && cd $root_dir

deno compile --allow-env --allow-read --allow-write --allow-run --output "${OUTPUT_DIR}/ao" --target x86_64-unknown-linux-gnu src/mod.js
zip -j "${OUTPUT_DIR}/ao-x86_64-unknown-linux-gnu.zip" "${OUTPUT_DIR}/ao"
rm -f "${OUTPUT_DIR}/ao"

deno compile --allow-env --allow-read --allow-write --allow-run --output "${OUTPUT_DIR}/ao" --target aarch64-apple-darwin src/mod.js
zip -j "${OUTPUT_DIR}/ao-aarch64-apple-darwin.zip" "${OUTPUT_DIR}/ao"
rm -f "${OUTPUT_DIR}/ao"

deno compile --allow-env --allow-read --allow-write --allow-run --output "${OUTPUT_DIR}/ao" --target x86_64-apple-darwin src/mod.js
zip -j "${OUTPUT_DIR}/ao-x86_64-apple-darwin.zip" "${OUTPUT_DIR}/ao"
rm -f "${OUTPUT_DIR}/ao"

deno compile --allow-env --allow-read --allow-write --allow-run --output "${OUTPUT_DIR}/ao".exe --target x86_64-pc-windows-msvc src/mod.js
zip -j "${OUTPUT_DIR}/ao-x86_64-pc-windows-msvc.exe.zip" "${OUTPUT_DIR}/ao.exe"
rm -f "${OUTPUT_DIR}/ao.exe"

#  stdout, so can be piped or saved to a variable
echo "$(pwd)/${OUTPUT_DIR}"
