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
    processes (row_id) {
        row_id -> Int4,
        #[max_length = 255]
        process_id -> Nullable<Varchar>,
        process -> Nullable<Jsonb>,
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    messages,
    processes,
);
