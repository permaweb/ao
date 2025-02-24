// @generated automatically by Diesel CLI.

diesel::table! {
    messages (row_id) {
        row_id -> Int4,
        #[max_length = 255]
        process_id -> Varchar,
        #[max_length = 255]
        message_id -> Varchar,
        message_data -> Jsonb,
        epoch -> Int4,
        nonce -> Int4,
        timestamp -> Int8,
        bundle -> Bytea,
        hash_chain -> Text,
        #[max_length = 255]
        assignment_id -> Nullable<Varchar>,
    }
}

diesel::table! {
    process_schedulers (row_id) {
        row_id -> Int4,
        process_id -> Varchar,
        scheduler_row_id -> Int4,
    }
}

diesel::table! {
    processes (row_id) {
        row_id -> Int4,
        #[max_length = 255]
        process_id -> Varchar,
        process_data -> Jsonb,
        bundle -> Bytea,
        epoch -> Nullable<Int4>,
        nonce -> Nullable<Int4>,
        hash_chain -> Nullable<Text>,
        timestamp -> Nullable<Int8>,
    }
}

diesel::table! {
    schedulers (row_id) {
        row_id -> Int4,
        url -> Varchar,
        process_count -> Int4,
        no_route -> Nullable<Bool>,
        wallets_to_route -> Nullable<Text>,
        wallets_only -> Nullable<Bool>,
    }
}

diesel::joinable!(process_schedulers -> schedulers (scheduler_row_id));

diesel::allow_tables_to_appear_in_same_query!(
    messages,
    process_schedulers,
    processes,
    schedulers,
);
