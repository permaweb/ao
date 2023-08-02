-- +migrate Down
ALTER TABLE bundle_items DROP COLUMN IF EXISTS data_item bytea;

-- +migrate Up
ALTER TABLE bundle_items ADD COLUMN IF NOT EXISTS data_item bytea;
