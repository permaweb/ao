-- +migrate Down
DROP TRIGGER IF EXISTS bundle_items_fill_updated_at ON bundle_items;

-- +migrate Up

-- +migrate StatementBegin
DO $$ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        pg_trigger
    WHERE
        tgname = 'bundle_items_fill_updated_at'
) THEN CREATE TRIGGER bundle_items_fill_updated_at
BEFORE
UPDATE
    ON bundle_items FOR EACH ROW EXECUTE PROCEDURE fill_updated_at();
END IF;
END $$;
-- +migrate StatementEnd