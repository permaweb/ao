CREATE TABLE IF NOT EXISTS schedulers (
    row_id SERIAL PRIMARY KEY,
    url VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS processes (
    row_id SERIAL PRIMARY KEY,
    process_id VARCHAR NOT NULL,
    scheduler_row_id INTEGER,
    CONSTRAINT fk_scheduler FOREIGN KEY (scheduler_row_id) REFERENCES schedulers (row_id)
);
