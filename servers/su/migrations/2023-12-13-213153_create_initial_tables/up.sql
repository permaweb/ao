CREATE TABLE processes (
  row_id SERIAL PRIMARY KEY,
  process_id VARCHAR(255) NOT NULL UNIQUE,
  process_data JSONB NOT NULL,
  bundle BYTEA NOT NULL
);

CREATE INDEX idx_process_id ON processes (process_id);

CREATE TABLE messages (
  row_id SERIAL PRIMARY KEY,
  process_id VARCHAR(255) NOT NULL REFERENCES processes(process_id),
  message_id VARCHAR(255) NOT NULL UNIQUE,
  message_data JSONB NOT NULL,
  epoch INTEGER NOT NULL,
  nonce INTEGER NOT NULL,
  "timestamp" INTEGER NOT NULL,
  bundle BYTEA NOT NULL
);

CREATE INDEX idx_messages_process_id ON messages(process_id);

CREATE INDEX idx_messages_message_id ON messages(message_id);

-- these tables are for the top level routing su
CREATE TABLE IF NOT EXISTS schedulers (
    row_id SERIAL PRIMARY KEY,
    url VARCHAR NOT NULL UNIQUE,
    process_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS process_schedulers (
    row_id SERIAL PRIMARY KEY,
    process_id VARCHAR NOT NULL UNIQUE,
    scheduler_row_id INTEGER NOT NULL,
    FOREIGN KEY (scheduler_row_id) REFERENCES schedulers(row_id)
);