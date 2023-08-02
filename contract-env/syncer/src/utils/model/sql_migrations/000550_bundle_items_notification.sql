-- +migrate Down
-- DROP FUNCTION IF EXISTS notify_pending_bundle_item;
-- +migrate Up

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION notify_pending_bundle_item() RETURNS trigger AS $$
DECLARE
	is_queue_full boolean; 
	is_bundler_listening boolean;
	is_uploading boolean;
	is_too_big boolean;
	payload jsonb;
BEGIN
	-- Skip if there's a risk pg_notify would fail
	SELECT pg_notification_queue_usage() > 0.95 INTO is_queue_full;
	IF is_queue_full THEN
		-- pg_notify would fail upon full queue, so let's avoid this situation
		-- This bundle item WON'T GET LOST, it will be picked up by the bundler's polling job
		RETURN NEW;
	END IF;

	-- Skip if there's no bundler listening
	SELECT EXISTS(SELECT pid FROM pg_stat_activity WHERE query='listen "bundle_items_pending"') INTO is_bundler_listening;
	IF NOT is_bundler_listening THEN
		-- Bundler is down, it will get this bundle item when it comes back up
		RETURN NEW;
	END IF;

    -- Update state to UPLOADING
	UPDATE bundle_items 
	SET state = 'UPLOADING'::bundle_state 
	WHERE interaction_id = NEW.interaction_id
	AND state = 'PENDING'::bundle_state
	RETURNING TRUE INTO is_uploading;

	IF NOT is_uploading THEN
		-- TX got selected by the polling mechanism, we're done
		RETURN NEW;
	END IF;


	SELECT pg_column_size(NEW.transaction) + pg_column_size(NEW.tags) + pg_column_size(NEW.data_item) > 7900 INTO is_too_big;
	IF is_too_big THEN
		payload = jsonb_build_object(
			'id', NEW.interaction_id
		);
		PERFORM pg_notify('bundle_items_pending', payload::TEXT);
	ELSE
		payload = jsonb_build_object(
            'di', NEW.data_item,
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