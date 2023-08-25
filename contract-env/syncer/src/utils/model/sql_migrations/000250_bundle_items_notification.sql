-- +migrate Down
-- DROP FUNCTION IF EXISTS notify_pending_bundle_item;
-- +migrate Up

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION notify_pending_bundle_item() RETURNS trigger AS $$
DECLARE
	is_queue_full boolean; 
	is_uploading boolean;
	is_too_big boolean;
	payload jsonb;
BEGIN
	SELECT pg_notification_queue_usage() > 0.95 INTO is_queue_full;

	IF is_queue_full THEN
		-- pg_notify would fail upon full queue, so let's avoid this situation
		-- This bundle item WON'T GET LOST, it will be picked up by the bundler's polling job
		RETURN NEW;
	END IF;

	UPDATE bundle_items 
	SET state = 'UPLOADING'::bundle_state 
	WHERE interaction_id = NEW.interaction_id
	AND state = 'PENDING'::bundle_state
	RETURNING TRUE INTO is_uploading;

	IF NOT is_uploading THEN
		-- TX got selected by the polling mechanism, we're done
		RETURN NEW;
	END IF;


	SELECT pg_column_size(NEW.transaction) + pg_column_size(NEW.tags) > 7900 INTO is_too_big;

	IF is_too_big THEN
		payload = jsonb_build_object(
			'id', NEW.interaction_id
		);
		PERFORM pg_notify('bundle_items_pending', payload::TEXT);
	ELSE
		payload = jsonb_build_object(
			'tx', NEW.transaction,
            'tg', NEW.tags,
			'id', NEW.interaction_id
		);
		PERFORM pg_notify('bundle_items_pending', payload::TEXT);
	END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +migrate StatementEnd