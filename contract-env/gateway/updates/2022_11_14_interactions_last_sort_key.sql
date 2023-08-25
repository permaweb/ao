ALTER table interactions
    ADD COLUMN last_sort_key text DEFAULT null;
CREATE UNIQUE INDEX interactions_last_sort_key_index ON interactions (last_sort_key);


ALTER table sequencer
    ADD COLUMN last_sort_key text DEFAULT null;
