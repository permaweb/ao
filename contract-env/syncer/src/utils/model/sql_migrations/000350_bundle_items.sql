-- +migrate Down
DROP INDEX IF EXISTS idx_bundle_items_checker_uploaded_height;

-- +migrate Up
DROP INDEX IF EXISTS idx_bundle_items_block_height;

CREATE INDEX IF NOT EXISTS idx_bundle_items_checker_uploaded_height ON bundle_items 
USING btree(block_height ASC)
INCLUDE (interaction_id)
WHERE state = 'UPLOADED';