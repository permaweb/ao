-- +migrate Down
DROP INDEX IF EXISTS idx_interactions_max_sort_key;

-- +migrate Up
CREATE INDEX IF NOT EXISTS idx_interactions_max_sort_key ON interactions 
USING btree(contract_id, block_height DESC, sort_key DESC)
INCLUDE (sort_key);