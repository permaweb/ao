CREATE TABLE processes (
  row_id SERIAL PRIMARY KEY,
  process_id VARCHAR(255) UNIQUE
);

CREATE INDEX idx_process_id ON processes (process_id);

CREATE TABLE messages (
  row_id SERIAL PRIMARY KEY,
  process_id VARCHAR(255) REFERENCES processes(process_id),
  message_id VARCHAR(255) UNIQUE,
  sort_key VARCHAR(255) UNIQUE,
  message_data JSONB 
);

CREATE INDEX idx_messages_process_id ON messages(process_id);

CREATE INDEX idx_messages_message_id ON messages(message_id);-- Your SQL goes here
