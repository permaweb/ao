UPDATE contracts SET block_height = 0 where block_height is null;
ALTER TABLE contracts ALTER COLUMN block_height set not null;

UPDATE contracts SET block_timestamp = 0 where block_timestamp is null;
ALTER TABLE contracts ALTER COLUMN block_timestamp set not null;
