-- Your SQL goes here
DROP index idx_messages_message_id;

CREATE UNIQUE index idx_messages_message_id
    ON messages (message_id);

ALTER TABLE messages
ADD CONSTRAINT messages_unique_message_id
UNIQUE USING INDEX idx_messages_message_id;