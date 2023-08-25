CREATE INDEX interactions_contract_id_block_height_conf_status_idx
    ON interactions (contract_id, block_height DESC NULLS LAST) INCLUDE (confirmation_status);