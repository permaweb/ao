/* eslint-disable */

/**
 * USAGE:
 *
 * deno run -A create-install-script.js [-- <SCRIPT_ARG>]
 *
 * OPTIONS:
 *
 * The transaction id that contains the binaries
 * --binaries=SYHBhGAmBo6fgAkINNoRtumOzxNB8-JFv2tPhBuNk5c
 */
import { parse } from 'https://deno.land/std@0.200.0/flags/mod.ts'
import { join } from 'https://deno.land/std@0.200.0/path/mod.ts'

async function main () {
  const { binaries } = parse(Deno.args)

  if (!binaries) {
    throw new Error('Insufficient arguments. "--binaries" is required')
  }

  const here = new URL(import.meta.url).pathname
  const dest = join(here, '../..', 'dist', 'install.sh')

  /**
   * A simple templated script that will install the ao binary from a known transaction
   * AO_BINARIES_TX_ID is replaced with the transaction id that contains the binaries
   */
  await Deno.writeTextFile(
    dest,
    `\
#!/bin/bash

# Copyright (C) arweave.org 2023
#
# This file is part of ao
#
# THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY
# TODO(everyone): Keep this script simple and easily auditable.

AO_BINARIES_TX_ID="${binaries}"

if ! command -v unzip >/dev/null; then
	echo "Error: unzip is required to install ao." 1>&2
	exit 1
fi

set -e

# Determine the target plaform and corresponding binary
ao_binary="ao"
if [ "$OS" = "Windows_NT" ]; then
	target="\${ao_binary}-x86_64-pc-windows-msvc.exe"
else
	case $(uname -sm) in
	"Darwin x86_64") target="\${ao_binary}-x86_64-apple-darwin" ;;
	"Darwin arm64") target="\${ao_binary}-aarch64-apple-darwin" ;;
	"Linux aarch64")
		echo "Error: Official ao builds for Linux aarch64 are not available." 1>&2
		exit 1
		;;
	*) target="\${ao_binary}-x86_64-unknown-linux-gnu" ;;
	esac
fi

# Construct uri to correct binary
ao_uri="https://arweave.net/\${AO_BINARIES_TX_ID}/\${target}.zip"

# Setup location to download the binary
ao_install="\${AO_INSTALL:-$HOME/.ao}"
bin_dir="$ao_install/bin"
exe="$bin_dir/ao"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

# Download the binary
curl --fail --location --progress-bar --output "$exe.zip" "$ao_uri"
unzip -d "$bin_dir" -o "$exe.zip"
chmod +x "$exe"
rm "$exe.zip"

# Check whether ao is already on the host PATH
# 
# If not, provide directions on how to add to the host PATH
echo "ao was installed successfully to $exe"
if command -v ao >/dev/null; then
	echo "Run 'ao --help' to get started"
else
	case $SHELL in
	/bin/zsh) shell_profile=".zshrc" ;;
	*) shell_profile=".bashrc" ;;
	esac
	echo "Manually add the directory to your \$HOME/$shell_profile (or similar)"
	echo "  export AO_INSTALL=\"$ao_install\""
	echo "  export PATH=\\"\\$AO_INSTALL/bin:\\$PATH\\""
	echo "Run '$exe --help' to get started"
fi
echo
`
  )

  return dest
}

// stdout, so can be piped or saved to a variable
await main().then(console.log)
