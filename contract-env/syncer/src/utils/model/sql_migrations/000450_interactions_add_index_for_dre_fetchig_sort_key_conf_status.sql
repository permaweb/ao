-- +migrate Down
DROP INDEX interactions_contract_sort_key_confirmation_status;

-- +migrate Up
CREATE INDEX interactions_contract_sort_key_confirmation_status
  ON interactions (contract_id asc, sort_key asc) WHERE confirmation_status IN ('confirmed', 'not_processed');