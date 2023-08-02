ALTER TABLE contracts
    ADD COLUMN block_height integer;


ALTER TABLE contracts
    ADD COLUMN content_type varchar(255) default 'application/json';
