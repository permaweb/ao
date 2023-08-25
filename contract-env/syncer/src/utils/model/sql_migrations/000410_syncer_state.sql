-- +migrate Down
DROP TABLE IF EXISTS syncer_state;

-- +migrate Up
DROP TABLE IF EXISTS syncer_state;

CREATE TABLE IF NOT EXISTS sync_state
(
    name synced_component PRIMARY KEY,
    finished_block_height BIGINT NOT NULL,
    finished_block_hash TEXT NOT NULL,
    CONSTRAINT check_block_height CHECK (finished_block_height > 422250)
);

INSERT INTO sync_state(name, finished_block_height, finished_block_hash) VALUES ('Interactions', 1161063, 'llxixWkllI9qzOVIjPhfGULFwtUmIkrCFusB3UIm8v_t1PKGlw87snWJ66lQdPcS' );
INSERT INTO sync_state(name, finished_block_height, finished_block_hash) VALUES ('Contracts', 1161063, 'llxixWkllI9qzOVIjPhfGULFwtUmIkrCFusB3UIm8v_t1PKGlw87snWJ66lQdPcS' );