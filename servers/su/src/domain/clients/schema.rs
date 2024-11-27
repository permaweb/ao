use diesel::prelude::*;

table! {
    processes (row_id) {
        row_id -> Int4,
        process_id -> Varchar,
        process_data -> Jsonb,
        bundle -> Bytea,
        epoch -> Nullable<Int4>,
        nonce -> Nullable<Int4>,
        timestamp -> Nullable<BigInt>,
        hash_chain -> Nullable<Text>,
    }
}

table! {
    messages (row_id) {
        row_id -> Int4,
        process_id -> Varchar,
        message_id -> Varchar,
        assignment_id -> Nullable<Varchar>,
        message_data -> Jsonb,
        epoch -> Int4,
        nonce -> Int4,
        timestamp -> BigInt,
        bundle -> Bytea,
        hash_chain -> Text,
    }
}

table! {
    schedulers (row_id) {
        row_id -> Int4,
        url -> Varchar,
        process_count -> Int4,
        no_route -> Nullable<Bool>,
        wallets_to_route -> Nullable<Text>,
        wallets_only -> Nullable<Bool>,
    }
}

table! {
    process_schedulers (row_id) {
        row_id -> Int4,
        process_id -> Varchar,
        scheduler_row_id -> Int4,
    }
}

allow_tables_to_appear_in_same_query!(processes, messages, schedulers, process_schedulers,);
