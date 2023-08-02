create table sequencer
(
    id                      serial
        constraint sequencer_pk
            primary key,
    original_sig            text not null,
    original_owner          text not null,
    sequence_block_id       text not null,
    sequence_block_height   int  not null,
    sequence_transaction_id text not null,
    bundled_tx_id           text not null
);

create unique index sequencer_sequence_transaction_id_uindex
    on sequencer (sequence_transaction_id);

alter table interactions
    add column source varchar(255) not null default 'arweave';

create index interactions_source_index
    on interactions (source);

alter table interactions
    add column bundled_in varchar(255) default null;

alter table sequencer
    add column bundler_response text not null;

alter table sequencer
    add column original_address text not null;
