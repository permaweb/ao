-- This file should undo anything in `up.sql`
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_unique_message_id;

DROP index IF EXISTS idx_messages_message_id;
CREATE index idx_messages_message_id
    ON messages (message_id);