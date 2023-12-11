CREATE TABLE IF NOT EXISTS schedulers (
    row_id SERIAL PRIMARY KEY,
    url VARCHAR NOT NULL
);

-- want to make sure if the sql runs twice it doesnt crash the pipeline
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'processes' 
        AND column_name = 'scheduler_row_id'
    ) THEN
        ALTER TABLE processes ADD COLUMN scheduler_row_id INTEGER;
        ALTER TABLE processes ADD FOREIGN KEY (scheduler_row_id) REFERENCES schedulers(row_id);
    END IF;
END
$$;
