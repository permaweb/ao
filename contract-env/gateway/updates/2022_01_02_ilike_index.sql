create index interactions_block_height_interaction_id_index
    on interactions (block_height desc, interaction_id desc);

CREATE EXTENSION pg_trgm;

CREATE INDEX idx_interaction_id_gin ON interactions USING gin (interaction_id gin_trgm_ops);
CREATE INDEX idx_contract_id_gin ON interactions USING gin (contract_id gin_trgm_ops);
