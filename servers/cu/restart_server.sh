#!/usr/bin/env sh

# Exit immediately if a command exits with a non-zero status
set -e
# Exit if an uninitialized variable is used
set -u

# Enable debugging
DEBUG=true

debug_log() {
  if [ "$DEBUG" = true ]; then
    echo "[DEBUG] $1"
  fi
}

# Dry-run option
DRY_RUN=false
if [ "$#" -gt 0 ] && [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  debug_log "Dry-run mode enabled."
fi

debug_log "Fetching the latest nonces from SQLite DB files..."

# Step 1: Fetch the latest nonces from both SQLite DB files
largest_nonces=$(sqlite3 -csv ./largest_nonces.db "select processId, nonce from largest_nonces;")
debug_log "Fetched largest_nonces: $largest_nonces"

kinesis_nonces=$(sqlite3 -csv ./kinesis_largest_nonces.db "select processId, nonce from largest_nonces;")
debug_log "Fetched kinesis_nonces: $kinesis_nonces"

# Extract nonces for process IDs
process_id_1="GaQrvEMKBpkjofgnBi_B3IgIDmY_XYelVLB6GcRGrHc"
process_id_2="agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA"

debug_log "Processing nonces for process_id_1: $process_id_1"
debug_log "Processing nonces for process_id_2: $process_id_2"

# Function to validate if a value is an integer
validate_integer() {
  if ! echo "$1" | grep -qE '^[0-9]+$'; then
    echo "Error: Expected integer but got '$1'" >&2
    exit 1
  fi
}

# Get nonces for process_id_1
nonce_largest_1=$(echo "$largest_nonces" | grep "$process_id_1" | cut -d ',' -f2)
nonce_kinesis_1=$(echo "$kinesis_nonces" | grep "$process_id_1" | cut -d ',' -f2)
validate_integer "${nonce_largest_1:-0}"
validate_integer "${nonce_kinesis_1:-0}"
debug_log "nonce_largest_1: $nonce_largest_1"
debug_log "nonce_kinesis_1: $nonce_kinesis_1"

if [ "$nonce_largest_1" -le "$nonce_kinesis_1" ]; then
  min_nonce_1="$nonce_largest_1"
else
  min_nonce_1="$nonce_kinesis_1"
fi
debug_log "min_nonce_1: $min_nonce_1"

# Get nonces for process_id_2
nonce_largest_2=$(echo "$largest_nonces" | grep "$process_id_2" | cut -d ',' -f2)
nonce_kinesis_2=$(echo "$kinesis_nonces" | grep "$process_id_2" | cut -d ',' -f2)
validate_integer "${nonce_largest_2:-0}"
validate_integer "${nonce_kinesis_2:-0}"
debug_log "nonce_largest_2: $nonce_largest_2"
debug_log "nonce_kinesis_2: $nonce_kinesis_2"

if [ "$nonce_largest_2" -le "$nonce_kinesis_2" ]; then
  min_nonce_2="$nonce_largest_2"
else
  min_nonce_2="$nonce_kinesis_2"
fi
debug_log "min_nonce_2: $min_nonce_2"

debug_log "Fetching block heights using node script..."
# Step 2: Determine block heights for the smallest nonces
node_block_height_results=$(node get_block_heights.js "$process_id_1" "$min_nonce_1" "$process_id_2" "$min_nonce_2")
debug_log "node_block_height_results: $node_block_height_results"

# Parse the results
block_height_1=$(echo "$node_block_height_results" | jq -r '.block_height_1')
block_height_2=$(echo "$node_block_height_results" | jq -r '.block_height_2')

validate_integer "$block_height_1"
validate_integer "$block_height_2"
debug_log "block_height_1: $block_height_1"
debug_log "block_height_2: $block_height_2"

# Determine the smaller block height
if [ "$block_height_1" -le "$block_height_2" ]; then
  max_checkpoint_block_height="$block_height_1"
else
  max_checkpoint_block_height="$block_height_2"
fi
min_checkpoint_block_height=$((max_checkpoint_block_height - 10000))
debug_log "max_checkpoint_block_height: $max_checkpoint_block_height"
debug_log "min_checkpoint_block_height: $min_checkpoint_block_height"

# Dry-run behavior
if [ "$DRY_RUN" = true ]; then
  debug_log "Dry run complete. Exiting."
  echo "Dry run: MIN_CHECKPOINT_BLOCK_HEIGHT=$min_checkpoint_block_height"
  echo "Dry run: MAX_CHECKPOINT_BLOCK_HEIGHT=$max_checkpoint_block_height"
  exit 0
fi

debug_log "Restarting the server with updated environment variables..."
# Step 3: Restart the server with updated environment variables
MIN_CHECKPOINT_BLOCK_HEIGHT=$min_checkpoint_block_height \
MAX_CHECKPOINT_BLOCK_HEIGHT=$max_checkpoint_block_height \
npm start
