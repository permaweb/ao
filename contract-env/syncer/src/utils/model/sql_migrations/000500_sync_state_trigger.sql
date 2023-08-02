-- +migrate Down
DROP TRIGGER IF EXISTS sync_state_notify ON sync_state;

-- +migrate Up

-- +migrate StatementBegin
DO $$ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        pg_trigger
    WHERE
        tgname = 'sync_state_notify'
) THEN CREATE TRIGGER sync_state_notify
AFTER
INSERT
    ON sync_state FOR EACH ROW EXECUTE PROCEDURE notify_sync_state();
END IF;
END $$;
-- +migrate StatementEnd