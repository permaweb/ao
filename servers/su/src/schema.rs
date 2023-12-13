// @generated automatically by Diesel CLI.

diesel::table! {
    messages (row_id) {
        row_id -> Int4,
        #[max_length = 255]
        process_id -> Nullable<Varchar>,
        #[max_length = 255]
        message_id -> Nullable<Varchar>,
        #[max_length = 255]
        sort_key -> Nullable<Varchar>,
        message_data -> Nullable<Jsonb>,
    }
}

diesel::table! {
    process_schedulers (row_id) {
        row_id -> Int4,
        process_id -> Varchar,
        scheduler_row_id -> Nullable<Int4>,
    }
}

diesel::table! {
    processes (row_id) {
        row_id -> Int4,
        #[max_length = 255]
        process_id -> Nullable<Varchar>,
        process_data -> Nullable<Jsonb>,
    }
}

diesel::table! {
    schedulers (row_id) {
        row_id -> Int4,
        url -> Varchar,
        process_count -> Int4,
    }
}

diesel::joinable!(process_schedulers -> schedulers (scheduler_row_id));

diesel::allow_tables_to_appear_in_same_query!(
    messages,
    process_schedulers,
    processes,
    schedulers,
);
