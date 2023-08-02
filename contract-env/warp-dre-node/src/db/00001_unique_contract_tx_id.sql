BEGIN;

-- Remove temp tables in case previous run failed
DROP TABLE IF EXISTS to_delete_states;

DROP TABLE IF EXISTS max_states;

-- Max sort keys in contracts that have multiple entries
CREATE TEMP TABLE max_states AS
SELECT
    contract_tx_id,
    MAX(sort_key) as max_sort_key
FROM
    states
GROUP BY
    contract_tx_id
HAVING
    COUNT(*) > 1;

-- States that get removed. PK is contract_tx_id + sort_key
CREATE TEMP TABLE to_delete_states AS
SELECT
    max_states.contract_tx_id,
    states.sort_key
FROM
    states
    JOIN max_states ON states.contract_tx_id = max_states.contract_tx_id
WHERE
    states.sort_key < max_states.max_sort_key;

-- Remove states
DELETE FROM
    states
WHERE
    EXISTS (
        SELECT
            *
        FROM
            to_delete_states
        WHERE
            to_delete_states.contract_tx_id = states.contract_tx_id
            AND to_delete_states.sort_key = states.sort_key
    );

-- There's one entry per contract_tx_id, so we can create a unique index
CREATE UNIQUE INDEX IF NOT EXISTS states_contract_tx_id_unique ON states(contract_tx_id);

-- Remove the old index
DROP INDEX IF EXISTS states_contract_tx_id_index;

-- Cleanup
DROP TABLE to_delete_states;

DROP TABLE max_states;

COMMIT;

VACUUM;
