ALTER table interactions ADD COLUMN interact_write text[];
CREATE INDEX idx_interact_write_gin on interactions using GIN(interact_write);
