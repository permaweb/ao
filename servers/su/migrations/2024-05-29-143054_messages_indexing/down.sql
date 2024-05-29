-- This file should undo anything in `up.sql`
CREATE INDEX idx_messages_process_id ON messages(process_id);
DROP INDEX idx_messages_process_id_timestamp;