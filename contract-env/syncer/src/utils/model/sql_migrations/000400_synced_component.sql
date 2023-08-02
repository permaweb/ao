-- +migrate Down
DROP TYPE IF EXISTS synced_component;

-- +migrate Up
-- +migrate StatementBegin
DO $$ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        pg_type
    WHERE
        typname = 'synced_component'
) THEN CREATE TYPE synced_component AS ENUM (
    'Interactions',
    'Contracts'
);

END IF;
END $$;

-- +migrate StatementEnd