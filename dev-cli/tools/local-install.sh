#!/bin/bash

# Use this script to install the locally built ao CLI binary
# during development
# 
# It does all the same things as the remote install script, except
# that it pulls the zip file from the local OUTPUT_DIR folder
# instead of from Arweave

if ! command -v unzip >/dev/null; then
	echo "Error: unzip is required to install ao." 1>&2
	exit 1
fi

set -e

# change directory to root of dev-cli to ensure this script works no matter where it is ran
cd "$(dirname "$0")/.."
OUTPUT_DIR="dist"

# Determine the target plaform and corresponding binary
ao_binary="ao"
if [ "$OS" = "Windows_NT" ]; then
	target="${ao_binary}-x86_64-pc-windows-msvc.exe"
else
	case $(uname -sm) in
	"Darwin x86_64") target="${ao_binary}-x86_64-apple-darwin" ;;
	"Darwin arm64") target="${ao_binary}-aarch64-apple-darwin" ;;
	"Linux aarch64")
		echo "Error: Official ao builds for Linux aarch64 are not available." 1>&2
		exit 1
		;;
	*) target="${ao_binary}-x86_64-unknown-linux-gnu" ;;
	esac
fi

# Construct uri to correct binary
ao_uri="${OUTPUT_DIR}/${target}.zip"

# Setup location to download the binary
ao_install="${AO_INSTALL:-$HOME/.ao}"
bin_dir="$ao_install/bin"
exe="$bin_dir/ao"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

# Download the binary
cp "$ao_uri" "$exe.zip"
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
	echo "Manually add the directory to your $HOME/$shell_profile (or similar)"
	echo "  export AO_INSTALL="$ao_install""
	echo "  export PATH=\"\$AO_INSTALL/bin:\$PATH\""
	echo "Run '$exe --help' to get started"
fi
echo
