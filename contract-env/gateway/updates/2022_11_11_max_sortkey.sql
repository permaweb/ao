create index if not exists interactions_contract_id_sort_key_index
    on interactions (contract_id asc, sort_key desc);
