-- +migrate Down
DROP INDEX IF EXISTS idx_contracts_src_tx_id_non_error;

-- +migrate Up
-- This index is used for counting valid contracts by src tx id
CREATE INDEX IF NOT EXISTS idx_contracts_src_tx_id_non_error
    ON contracts (src_tx_id) WHERE type <> 'error';
