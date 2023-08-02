-- +migrate Down
ALTER TABLE bundle_items DROP COLUMN IF EXISTS tags;
-- +migrate Up
ALTER TABLE bundle_items ADD COLUMN IF NOT EXISTS tags jsonb;