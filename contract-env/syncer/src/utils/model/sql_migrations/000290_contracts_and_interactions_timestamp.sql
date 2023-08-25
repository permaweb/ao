-- +migrate Down
ALTER TABLE interactions DROP COLUMN IF EXISTS timestamp;
ALTER TABLE contracts DROP COLUMN IF EXISTS timestamp;

-- +migrate Up
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS timestamp bigint;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS timestamp bigint;

