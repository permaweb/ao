-- +migrate Down
DROP INDEX IF EXISTS idx_bundle_items_checker_checking_updated_at;

-- +migrate Up
-- This index is used only for retrying failed checks by checker
CREATE INDEX IF NOT EXISTS idx_bundle_items_checker_checking_updated_at ON bundle_items 
USING btree(updated_at DESC)
INCLUDE (interaction_id)
WHERE state = 'CHECKING'::bundle_state;