-- +migrate Down
DROP TRIGGER IF EXISTS interactions_notify_l2 ON interactions;

-- +migrate Up

-- +migrate StatementBegin
DO $$ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        pg_trigger
    WHERE
        tgname = 'interactions_notify_l2'
) THEN CREATE TRIGGER interactions_notify_l2
AFTER
INSERT
    ON interactions FOR EACH ROW EXECUTE PROCEDURE notify_l2_interaction();
END IF;
END $$;
-- +migrate StatementEnd