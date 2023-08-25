ALTER TABLE contracts
    ADD COLUMN testnet text default null;

CREATE INDEX contracts_testnet_index
    ON contracts (testnet);

ALTER TABLE interactions
    ADD COLUMN testnet text default null;

CREATE INDEX interactions_testnet_index
    ON interactions (testnet);

ALTER TABLE contracts_src
    ADD COLUMN testnet text default null;

CREATE INDEX contracts_src_testnet_index
    ON contracts_src (testnet);
