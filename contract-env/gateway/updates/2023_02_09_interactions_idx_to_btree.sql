DROP INDEX idx_contract_id_gin;
create index idx_interactions_contract_id
    on interactions (contract_id);

DROP INDEX idx_interaction_id_gin;
create index idx_interactions_interaction_id
    on interactions (interaction_id);

DROP INDEX idx_src_tx_id_id_gin;
create index idx_contracts_src_src_tx_id
    on contracts_src (src_tx_id);
