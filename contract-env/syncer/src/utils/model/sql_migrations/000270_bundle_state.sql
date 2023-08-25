-- +migrate Down
ALTER TYPE bundle_state DROP VALUE 'MALFORMED';

-- +migrate Up
ALTER TYPE bundle_state ADD VALUE 'MALFORMED';
