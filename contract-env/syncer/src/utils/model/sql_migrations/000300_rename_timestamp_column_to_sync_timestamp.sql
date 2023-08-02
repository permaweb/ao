-- +migrate Down
ALTER TABLE interactions
RENAME COLUMN sync_timestamp TO timestamp;

ALTER TABLE contracts
RENAME COLUMN sync_timestamp TO timestamp;

-- +migrate Up
ALTER TABLE interactions
RENAME COLUMN timestamp TO sync_timestamp;

ALTER TABLE contracts
RENAME COLUMN timestamp TO sync_timestamp;
