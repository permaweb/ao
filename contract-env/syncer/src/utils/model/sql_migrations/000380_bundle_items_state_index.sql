-- +migrate Down
DROP INDEX IF EXISTS idx_bundle_items_state;

-- +migrate Up
-- This index is used for counting bundles in each state
CREATE INDEX IF NOT EXISTS idx_bundle_items_state ON bundle_items 
USING btree(state);
