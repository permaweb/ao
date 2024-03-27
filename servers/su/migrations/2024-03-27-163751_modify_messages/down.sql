DROP INDEX IF EXISTS idx_assignments_assignment_id;

ALTER TABLE messages DROP COLUMN IF EXISTS assignment_id;

ALTER TABLE messages ADD CONSTRAINT messages_message_id_key UNIQUE (message_id);