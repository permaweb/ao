ALTER TABLE processes
ADD COLUMN epoch INTEGER NULL,
ADD COLUMN nonce INTEGER NULL,
ADD COLUMN hash_chain TEXT NULL,
ADD COLUMN "timestamp" BIGINT NULL;