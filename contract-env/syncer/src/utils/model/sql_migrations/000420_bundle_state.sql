-- +migrate Down

-- +migrate Up
ALTER TYPE bundle_state RENAME VALUE 'ON_ARWEAVE' TO 'VALUE_REMOVED';
ALTER TYPE bundle_state RENAME VALUE 'ON_BUNDLER' TO 'ON_ARWEAVE';
