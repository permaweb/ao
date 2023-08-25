ALTER TABLE contracts
    ALTER COLUMN block_timestamp drop not null;

ALTER TABLE contracts
    ALTER COLUMN block_height drop not null;

ALTER table contracts
    ADD COLUMN bundler_response text;


ALTER table contracts_src
    ADD COLUMN bundler_response text;

ALTER table contracts
    ADD COLUMN deployment_type varchar(64);

ALTER table contracts_src
    ADD COLUMN deployment_type varchar(64);