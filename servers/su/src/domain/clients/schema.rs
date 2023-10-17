use diesel::prelude::*;

table! {
    processes (row_id) {
        row_id -> Integer,
        process_id -> Varchar,
    }
}

table! {
    messages (row_id) {
        row_id -> Integer,
        process_id -> Varchar,
        message_id -> Varchar,
        sort_key -> Varchar,
        message_data -> Jsonb,
    }
}