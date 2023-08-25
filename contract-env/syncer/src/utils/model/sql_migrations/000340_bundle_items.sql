-- +migrate Down
DROP INDEX IF EXISTS idx_bundle_items_poller_pending_state;

-- +migrate Up

DROP INDEX IF EXISTS idx_bundle_items_poller_pending_state;

-- This index is used to find pending bundles
CREATE INDEX IF NOT EXISTS idx_bundle_items_poller_pending_state ON bundle_items 
USING btree(interaction_id)
WHERE state = 'PENDING'::bundle_state;
