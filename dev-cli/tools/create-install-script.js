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
import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import { join } from "https://deno.land/std@0.200.0/path/mod.ts";

async function main() {
	const { binaries } = parse(Deno.args);

	if (!binaries) {
		throw new Error('Insufficient arguments. "--binaries" is required');
	}

	const here = new URL(import.meta.url).pathname;
	const dest = join(here, "../..", "dist", "install.sh");

	/**
	 * A simple templated script that will install the hyperbeam binary from a known transaction
	 * HYPERBEAM_BINARIES_TX_ID is replaced with the transaction id that contains the binaries
	 */
	await Deno.writeTextFile(
		dest,
		`\
#!/bin/bash

# Copyright (C) arweave.org 2023
#
# This file is part of hyperbeam
#
# THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY
# TODO(everyone): Keep this script simple and easily auditable.

HYPERBEAM_BINARIES_TX_ID="${binaries}"

if ! command -v unzip >/dev/null; then
	echo "Error: unzip is required to install hyperbeam." 1>&2
	exit 1
fi

set -e

# Determine the target plaform and corresponding binary
hyperbeam_binary="hyperbeam"
if [ "$OS" = "Windows_NT" ]; then
	target="\${hyperbeam_binary}-x86_64-pc-windows-msvc.exe"
else
	case $(uname -sm) in
	"Darwin x86_64") target="\${hyperbeam_binary}-x86_64-apple-darwin" ;;
	"Darwin arm64") target="\${hyperbeam_binary}-aarch64-apple-darwin" ;;
	"Linux aarch64")
		echo "Error: Official hyperbeam builds for Linux aarch64 are not available." 1>&2
		exit 1
		;;
	*) target="\${hyperbeam_binary}-x86_64-unknown-linux-gnu" ;;
	esac
fi

# Construct uri to correct binary
hyperbeam_uri="https://arweave.net/\${HYPERBEAM_BINARIES_TX_ID}/\${target}.zip"

# Setup location to download the binary
hyperbeam_install="\${HYPERBEAM_INSTALL:-$HOME/.hyperbeam}"
bin_dir="$hyperbeam_install/bin"
exe="$bin_dir/hb"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

# Download the binary
curl --fail --location --progress-bar --output "$exe.zip" "$hyperbeam_uri"
unzip -d "$bin_dir" -o "$exe.zip"
chmod +x "$exe"
rm "$exe.zip"

# Check whether hyperbeam is already on the host PATH
# 
# If not, provide directions on how to add to the host PATH
echo "hyperbeam was installed successfully to $exe"
if command -v hb >/dev/null; then
	echo "Run 'hb --help' to get started"
else
	case $SHELL in
	/bin/zsh) shell_profile=".zshrc" ;;
	*) shell_profile=".bashrc" ;;
	esac
	echo "Manually add the directory to your \$HOME/$shell_profile (or similar)"
	echo "  export HYPERBEAM_INSTALL=\"$hyperbeam_install\""
	echo "  export PATH=\\"\\$HYPERBEAM_INSTALL/bin:\\$PATH\\""
	echo "Run '$exe --help' to get started"
fi
echo
`,
	);

	// stdout, so can be piped or saved to a variable
	console.log(dest);
}

await main();
