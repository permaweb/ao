ALTER table contracts ADD COLUMN bundler_contract_tx_id varchar(255);
ALTER table contracts ADD COLUMN bundler_contract_node varchar(255);
ALTER table contracts ADD COLUMN bundler_src_tx_id varchar(255);
ALTER table contracts ADD COLUMN bundler_src_node varchar(255);

ALTER table contracts ADD COLUMN contract_tx jsonb;
ALTER table contracts ADD COLUMN src_tx jsonb;
