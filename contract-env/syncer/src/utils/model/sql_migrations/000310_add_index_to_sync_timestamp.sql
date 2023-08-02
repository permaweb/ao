-- +migrate Down
DROP INDEX contracts_sync_timestamp_index;
DROP INDEX interactions_sync_timestamp_index;

-- +migrate Up
CREATE INDEX contracts_sync_timestamp_index
  ON contracts(sync_timestamp);

CREATE INDEX interactions_sync_timestamp_index
  ON interactions(sync_timestamp);