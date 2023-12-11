use diesel::prelude::*;

table! {
    processes (row_id) {
        row_id -> Integer,
        process_id -> Varchar,
        scheduler_row_id -> Integer,
    }
}

table! {
    schedulers (row_id) {
        row_id -> Integer,
        url -> Varchar,
    }
}

joinable!(processes -> schedulers (scheduler_row_id)); // establishes the foreign key relationship
allow_tables_to_appear_in_same_query!(processes, schedulers);