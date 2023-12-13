use diesel::prelude::*;

table! {
    processes (row_id) {
        row_id -> Integer,
        process_id -> Varchar,
        process_data -> Jsonb,
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

/*
schedulers and process_schedulers are used
when the su is in router mode acting as 
a load balancer/router for the underlying sus
*/
table! {
    schedulers (row_id) {
        row_id -> Integer,
        url -> Varchar,
        process_count -> Integer,
    }
}

table! {
    process_schedulers (row_id) {
        row_id -> Integer,
        process_id -> Varchar,
        scheduler_row_id -> Integer,
    }
}
