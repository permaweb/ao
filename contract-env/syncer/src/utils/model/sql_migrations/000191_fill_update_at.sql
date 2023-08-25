-- +migrate Down
DROP FUNCTION IF EXISTS fill_updated_at;
-- +migrate Up

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION fill_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +migrate StatementEnd
