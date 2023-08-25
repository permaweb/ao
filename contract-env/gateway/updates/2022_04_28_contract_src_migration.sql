WITH sources AS (
    SELECT DISTINCT src_tx_id,
                    src,
                    src_content_type,
                    src_binary,
                    src_wasm_lang,
                    bundler_src_tx_id,
                    bundler_src_node,
                    src_tx
    FROM contracts
    WHERE src_tx_id IS NOT NULL AND src_tx_id != ''
)
INSERT INTO contracts_src
SELECT * FROM sources
ON CONFLICT DO NOTHING;