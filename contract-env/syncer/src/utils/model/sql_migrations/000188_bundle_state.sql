-- +migrate Down
DROP TYPE IF EXISTS bundle_state;

-- +migrate Up
-- +migrate StatementBegin
DO $$ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        pg_type
    WHERE
        typname = 'bundle_state'
) THEN CREATE TYPE bundle_state AS ENUM (
    'PENDING',
    'UPLOADING',
    'UPLOADED',
    'ON_BUNDLER',
    'ON_ARWEAVE'
);

END IF;
END $$;

-- +migrate StatementEnd