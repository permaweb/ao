-- these tables are for the top level routing su
CREATE TABLE IF NOT EXISTS schedulers (
    row_id SERIAL PRIMARY KEY,
    url VARCHAR NOT NULL UNIQUE,
    process_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS process_schedulers (
    row_id SERIAL PRIMARY KEY,
    process_id VARCHAR NOT NULL UNIQUE,
    scheduler_row_id INTEGER,
    FOREIGN KEY (scheduler_row_id) REFERENCES schedulers(row_id)
);