ALTER TABLE contracts
    ADD COLUMN block_timestamp bigint;

CREATE INDEX contracts_block_timestamp_index
    ON contracts (block_timestamp);
