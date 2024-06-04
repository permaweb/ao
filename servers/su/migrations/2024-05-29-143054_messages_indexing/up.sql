-- Your SQL goes here
DROP INDEX idx_messages_process_id;
CREATE INDEX idx_messages_process_id_timestamp ON messages(process_id, timestamp);