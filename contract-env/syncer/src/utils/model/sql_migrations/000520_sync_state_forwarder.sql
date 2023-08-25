-- +migrate Down
DELETE FROM sync_state WHERE name = 'Forwarder';
-- +migrate Up
INSERT INTO sync_state (name, finished_block_timestamp, finished_block_height, finished_block_hash) 
SELECT 'Forwarder', finished_block_timestamp, finished_block_height, finished_block_hash 
FROM sync_state 
WHERE name = 'Interactions' ;