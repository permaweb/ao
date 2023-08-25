-- +migrate Down
ALTER TYPE bundle_state DROP VALUE 'CHECKING';

-- +migrate Up
-- States used in checker to indicate that the bundle is being checked
-- This allows multiple checkers to run in parallel
ALTER TYPE bundle_state ADD VALUE 'CHECKING';
