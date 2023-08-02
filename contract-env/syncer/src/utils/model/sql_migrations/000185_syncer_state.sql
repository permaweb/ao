-- +migrate Down
DROP TABLE IF EXISTS syncer_state;

-- +migrate Up
CREATE TABLE IF NOT EXISTS syncer_state
(
    id bigint PRIMARY KEY DEFAULT 1,
    last_transaction_block_height bigint NOT NULL DEFAULT 1007373,
    CONSTRAINT ensure_one_row CHECK (id = 1)
);

INSERT INTO syncer_state(id) VALUES (1);