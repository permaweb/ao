ALTER TABLE schedulers
DROP COLUMN IF EXISTS wallets_to_route,
DROP COLUMN IF EXISTS wallets_only;