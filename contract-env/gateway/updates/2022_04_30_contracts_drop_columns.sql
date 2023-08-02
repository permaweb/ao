ALTER TABLE contracts
    DROP COLUMN src,
    DROP COLUMN src_content_type,
    DROP COLUMN src_binary,
    DROP COLUMN src_wasm_lang,
    DROP COLUMN bundler_src_node,
    DROP COLUMN bundler_src_tx_id,
    DROP COLUMN src_tx;
