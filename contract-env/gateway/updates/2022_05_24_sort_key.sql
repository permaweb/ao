ALTER TABLE interactions
    ADD COLUMN sort_key TEXT NOT NULL DEFAULT '';

CREATE INDEX interactions_sort_key_index
    ON interactions (sort_key) ;