ALTER TABLE messages ADD COLUMN assignment_id VARCHAR(255) UNIQUE;

CREATE INDEX idx_assignments_assignment_id ON messages(assignment_id);

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_id_key;