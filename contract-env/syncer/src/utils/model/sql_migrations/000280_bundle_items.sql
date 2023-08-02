-- +migrate Down
ALTER TABLE bundle_items DROP CONSTRAINT IF EXISTS bundlr_response_format;
ALTER TABLE bundle_items DROP CONSTRAINT IF EXISTS bundlr_response_for_on_bundler;
ALTER TABLE bundle_items DROP CONSTRAINT IF EXISTS bundlr_response_for_uploaded;

ALTER TABLE bundle_items DROP COLUMN IF EXISTS bundlr_response;

-- +migrate Up

ALTER TABLE bundle_items ADD COLUMN IF NOT EXISTS bundlr_response jsonb;

ALTER TABLE bundle_items ADD CONSTRAINT bundlr_response_for_uploaded CHECK ( state != 'UPLOADED' OR state = 'UPLOADED' AND bundlr_response IS NOT NULL);
ALTER TABLE bundle_items ADD CONSTRAINT bundlr_response_for_on_bundler CHECK ( state != 'ON_BUNDLER' OR state = 'ON_BUNDLER' AND bundlr_response IS NOT NULL);
ALTER TABLE bundle_items ADD CONSTRAINT bundlr_response_format CHECK ( bundlr_response IS NULL OR bundlr_response ? 'id');
