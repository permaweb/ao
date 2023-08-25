create index idx_contracts_non_error
    on contracts (contract_id)
    where type != 'error';