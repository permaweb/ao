
/*
If a su is in router mode it is redirecting
to underlying sus based on process id. 
ProcessScheduler is that cross reference from 
process to su.
*/

pub struct Scheduler {
    pub row_id: Option<i32>,
    pub url: String,
    pub process_count: i32
}

pub struct ProcessScheduler {
    pub row_id: Option<i32>,
    pub process_id: String,
    pub scheduler_row_id: i32
}