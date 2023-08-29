#!/bin/bash

# Use this script to install the locally built hyperbeam CLI binary
# during development
# 
# It does all the same things as the remote install script, except
# that it pulls the zip file from the local OUTPUT_DIR folder
# instead of from Arweave

if ! command -v unzip >/dev/null; then
	echo "Error: unzip is required to install hyperbeam." 1>&2
	exit 1
fi

set -e

# change directory to root of dev-cli to ensure this script works no matter where it is ran
cd "$(dirname "$0")/.."
OUTPUT_DIR="dist"

# Determine the target plaform and corresponding binary
hyperbeam_binary="hyperbeam"
if [ "$OS" = "Windows_NT" ]; then
	target="${hyperbeam_binary}-x86_64-pc-windows-msvc.exe"
else
	case $(uname -sm) in
	"Darwin x86_64") target="${hyperbeam_binary}-x86_64-apple-darwin" ;;
	"Darwin arm64") target="${hyperbeam_binary}-aarch64-apple-darwin" ;;
	"Linux aarch64")
		echo "Error: Official hyperbeam builds for Linux aarch64 are not available." 1>&2
		exit 1
		;;
	*) target="${hyperbeam_binary}-x86_64-unknown-linux-gnu" ;;
	esac
fi

# Construct uri to correct binary
hyperbeam_uri="${OUTPUT_DIR}/${target}.zip"

# Setup location to download the binary
hyperbeam_install="${HYPERBEAM_INSTALL:-$HOME/.hyperbeam}"
bin_dir="$hyperbeam_install/bin"
exe="$bin_dir/hb"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

# Download the binary
cp "$hyperbeam_uri" "$exe.zip"
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
	echo "Manually add the directory to your $HOME/$shell_profile (or similar)"
	echo "  export HYPERBEAM_INSTALL="$hyperbeam_install""
	echo "  export PATH=\"\$HYPERBEAM_INSTALL/bin:\$PATH\""
	echo "Run '$exe --help' to get started"
fi
echo
