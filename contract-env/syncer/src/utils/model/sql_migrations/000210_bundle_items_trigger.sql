-- +migrate Down
DROP TRIGGER IF EXISTS bundle_items_notify_insert ON bundle_items;

-- +migrate Up

-- +migrate StatementBegin
DO $$ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        pg_trigger
    WHERE
        tgname = 'bundle_items_notify_insert'
) THEN CREATE TRIGGER bundle_items_notify_insert
AFTER
INSERT
    ON bundle_items FOR EACH ROW EXECUTE PROCEDURE notify_pending_bundle_item();
END IF;
END $$;
-- +migrate StatementEnd