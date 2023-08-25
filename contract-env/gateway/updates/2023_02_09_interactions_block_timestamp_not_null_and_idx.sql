ALTER TABLE interactions
    ALTER block_timestamp SET NOT NULL;

CREATE INDEX idx_interactions_block_timestamp_testnet
    ON interactions (testnet, block_timestamp);
