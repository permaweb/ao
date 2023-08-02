-- +migrate Down
ALTER TABLE syncer_state DROP COLUMN IF EXISTS last_processed_block_hash;
-- +migrate Up
ALTER TABLE syncer_state ADD COLUMN IF NOT EXISTS last_processed_block_hash TEXT NULL;