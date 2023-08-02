BEGIN;

-- Remove automatically created indices 
DROP INDEX IF EXISTS states_sort_key_index;

DROP INDEX IF EXISTS black_list_contract_tx_id_index;

DROP INDEX IF EXISTS errors_job_id_index;

COMMIT;

VACUUM;
