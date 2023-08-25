DROP INDEX interactions_source_index;
DROP INDEX interactions_sort_key_index;
DROP INDEX interactions_interaction_id_uindex;
DROP INDEX interactions_evolve_index;
DROP INDEX interactions_contract_id_index;
DROP INDEX interactions_contract_id_block_height_conf_status_idx;
DROP INDEX interactions_confirmation_status_index;
DROP INDEX interactions_block_height_index;
DROP INDEX idx_interaction_id_gin;
DROP INDEX idx_interact_write_gin; 
DROP INDEX interactions_last_sort_key_index;

ALTER TABLE interactions ADD COLUMN owner text;
UPDATE interactions SET owner = interaction->'owner'->>'address';

CREATE INDEX idx_interaction_owner_gin ON interactions USING gin (owner gin_trgm_ops);
CREATE INDEX idx_contract_owner_gin ON contracts USING gin (owner gin_trgm_ops);

CREATE INDEX interactions_source_index
    ON interactions (source);

CREATE INDEX interactions_sort_key_index
    ON interactions (sort_key);

CREATE UNIQUE INDEX interactions_interaction_id_uindex
    ON interactions (interaction_id);

CREATE INDEX interactions_evolve_index
    ON interactions (evolve);

CREATE INDEX interactions_contract_id_index
    ON interactions (contract_id);

CREATE INDEX interactions_contract_id_block_height_conf_status_idx
    ON interactions (contract_id, block_height DESC NULLS LAST) INCLUDE (confirmation_status);

CREATE INDEX interactions_confirmation_status_index
    ON interactions (confirmation_status);

CREATE INDEX interactions_block_height_index
    ON interactions (block_height);

CREATE INDEX idx_interaction_id_gin ON interactions USING gin (interaction_id gin_trgm_ops);
CREATE INDEX idx_contract_id_gin ON interactions USING gin (contract_id gin_trgm_ops);
CREATE UNIQUE INDEX interactions_last_sort_key_index ON interactions (last_sort_key);
