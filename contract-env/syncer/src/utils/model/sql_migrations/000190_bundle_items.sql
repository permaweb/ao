-- +migrate Down
DROP INDEX IF EXISTS idx_bundle_items_block_height;

DROP TABLE IF EXISTS bundle_items;

-- +migrate Up
CREATE TABLE IF NOT EXISTS bundle_items (
    interaction_id BIGINT PRIMARY KEY REFERENCES interactions(id),
    state bundle_state NOT NULL,
    block_height BIGINT,

    -- Filled automatically by the trigger
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Transaction is smaller than 2MB
    transaction jsonb CONSTRAINT transaction_size CHECK (pg_column_size(transaction) <= 2097152)
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_block_height ON bundle_items USING btree (block_height DESC)
WHERE
    state <> 'ON_ARWEAVE' :: bundle_state;