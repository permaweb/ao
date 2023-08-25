ALTER TABLE contracts
    ADD COLUMN src_content_type varchar(255) default 'application/javascript';

ALTER TABLE contracts
    ADD COLUMN src_binary bytea default null;

ALTER TABLE contracts
    ADD COLUMN src_wasm_lang varchar(255) default null;

-- there might be more, but fu*k it for now.
UPDATE contracts
SET src_content_type = 'application/wasm',
    src_wasm_lang = 'rust'
WHERE contract_id = 'KfU_1Uxe3-h2r3tP6ZMfMT-HBFlM887tTFtS-p4edYQ';

create index contracts_src_content_type_index
    on contracts (src_content_type);

create index contracts_src_wasm_lang_index
    on contracts (src_wasm_lang);
