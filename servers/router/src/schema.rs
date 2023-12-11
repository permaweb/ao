// @generated automatically by Diesel CLI.

diesel::table! {
    processes (row_id) {
        row_id -> Int4,
        process_id -> Varchar,
        scheduler_row_id -> Nullable<Int4>,
    }
}

diesel::table! {
    schedulers (row_id) {
        row_id -> Int4,
        url -> Varchar,
    }
}

diesel::joinable!(processes -> schedulers (scheduler_row_id));

diesel::allow_tables_to_appear_in_same_query!(
    processes,
    schedulers,
);
