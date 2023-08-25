-- +migrate Down
ALTER TABLE syncer_state DROP COLUMN IF EXISTS contract_finished_height;
ALTER TABLE syncer_state DROP COLUMN IF EXISTS contract_finished_block_hash;
-- +migrate Up

--  Used to validate the that the new block is a part of the chain
ALTER TABLE syncer_state ADD COLUMN IF NOT EXISTS contract_finished_block_hash TEXT NULL;

-- Last block height that was scaned for contracts
ALTER TABLE syncer_state ADD COLUMN IF NOT EXISTS contract_finished_height bigint NULL;

