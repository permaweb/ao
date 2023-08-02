#!/bin/sh
set -ex
# This script will run the setup for cosmovisor and sequencer node,
# but only on the first run of the container
log() {
    printf "${RED}$1${NC}\n"
}

assert() {
    if [ -z "$1" ]; then
        log $2
        exit 1
    fi
}

configure() {
    # Predefined paths
    SEQUENCER_HOME="/root/.sequencer"
    export PATH=$PATH:/root/cosmovisor/genesis/bin

    # Colors
    RED='\033[0;31m'
    NC='\033[0m' # No Color
}

setupCosmovisor() {
    # Cosmovisor
    export DAEMON_HOME="/root"
    export DAEMON_NAME="sequencer"
    export DAEMON_ALLOW_DOWNLOAD_BINARIES="false"
    export DAEMON_RESTART_AFTER_UPGRADE="true"
    export DAEMON_POLL_INTERVAL="1s"

    mkdir -p $DAEMON_HOME/data

    if [ -d "$DAEMON_HOME/cosmovisor" ]; then
        return
    fi
}

setupSequencer() {
    if [ ! -f "$SEQUENCER_HOME/data/priv_validator_state.json" ]; then
        mkdir -p $SEQUENCER_HOME/data
        echo '{"height":"0","round":0,"step":0}' > $SEQUENCER_HOME/data/priv_validator_state.json
    fi
}

run() {
    cat $HOME/.sequencer/config/genesis.json
    cosmovisor version
    cosmovisor run start
}

echo "Starting entrypoint script"
configure
setupCosmovisor
setupSequencer
run
