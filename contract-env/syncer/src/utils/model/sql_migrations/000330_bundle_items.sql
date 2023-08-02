-- +migrate Down
DROP INDEX IF EXISTS idx_bundle_items_poller_pending_state;
DROP INDEX IF EXISTS idx_bundle_items_poller_uploading_updated_at;
DROP INDEX IF EXISTS idx_bundle_items_poller_malformed_updated_at;

-- +migrate Up
-- This index is used to find pending bundles
CREATE INDEX IF NOT EXISTS idx_bundle_items_poller_pending_state ON bundle_items 
USING btree(interaction_id)
WHERE state = 'PENDING'::bundle_state;

-- This index shouldn't get too big since it's used only for retrying failed bundles
CREATE INDEX IF NOT EXISTS idx_bundle_items_poller_uploading_updated_at ON bundle_items 
USING btree(updated_at DESC)
INCLUDE (interaction_id)
WHERE state = 'UPLOADING'::bundle_state;

-- If something goes wrong this index could grow a lot. 
-- This is why we use BRIN instead of BTree
CREATE INDEX IF NOT EXISTS idx_bundle_items_poller_malformed_updated_at ON bundle_items 
USING brin(updated_at)
WHERE state = 'MALFORMED'::bundle_state;

