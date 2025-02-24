ALTER TABLE schedulers
ADD COLUMN wallets_to_route TEXT NULL,
ADD COLUMN wallets_only BOOLEAN NULL;