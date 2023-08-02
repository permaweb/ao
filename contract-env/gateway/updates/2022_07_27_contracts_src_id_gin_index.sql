CREATE INDEX idx_src_tx_id_id_gin ON contracts_src USING gin (src_tx_id gin_trgm_ops);
