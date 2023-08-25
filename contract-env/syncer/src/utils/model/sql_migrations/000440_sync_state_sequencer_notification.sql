-- +migrate Down

-- +migrate Up

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION notify_sync_state() RETURNS trigger AS $$
DECLARE
	is_queue_full boolean; 
	is_forwarder_listening boolean;
	payload jsonb;
BEGIN
    -- Notify only upon Sequencer's changes
    IF NEW.name != 'Sequencer' THEN
        RETURN NEW;
    END IF;

	-- Skip if there's a risk pg_notify would fail
	SELECT pg_notification_queue_usage() > 0.999 INTO is_queue_full;
	IF is_queue_full THEN
		-- pg_notify would fail upon full queue, so let's avoid this situation
		-- This sync state won't get lost, it will be picked up by the polling mechanism
		RETURN NEW;
	END IF;

	-- Skip if there's no forwarder listening
	SELECT EXISTS(SELECT pid FROM pg_stat_activity WHERE query='listen "sync_state_sequencer"') INTO is_forwarder_listening;
	IF NOT is_forwarder_listening THEN
		-- Forwarder is down, it will get this sync_state update when it comes back up
		RETURN NEW;
	END IF;

    PERFORM pg_notify('sync_state_sequencer', jsonb_build_object(
        'finished_block_height', NEW.finished_block_height,
        'finished_block_hash', NEW.finished_block_hash
    )::TEXT);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +migrate StatementEnd