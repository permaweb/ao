-- +migrate Down
ALTER TABLE sync_state DROP COLUMN IF EXISTS finished_block_timestamp;
-- +migrate Up
ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS finished_block_timestamp bigint;