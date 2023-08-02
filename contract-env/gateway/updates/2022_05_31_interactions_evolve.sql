ALTER TABLE interactions
    ADD COLUMN evolve varchar(64);

CREATE INDEX interactions_evolve_index
    ON interactions (evolve);