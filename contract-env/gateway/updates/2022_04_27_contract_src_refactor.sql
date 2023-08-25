create table contracts_src
(
    src_tx_id              varchar(64) not null primary key,
    src                    text,
    src_content_type       varchar(255) default 'application/javascript'::character varying,
    src_binary             bytea,
    src_wasm_lang          varchar(255) default NULL::character varying,
    bundler_src_tx_id      varchar(255),
    bundler_src_node       varchar(255),
    src_tx                 jsonb
);

