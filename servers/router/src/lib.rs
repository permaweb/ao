mod clients;
mod bytes;
mod config;

pub mod su_router {
    use std::sync::Arc;
    pub use super::clients::store::StoreClient;

    pub struct Deps {
        pub data_store: Arc<StoreClient>
    }

    pub struct Process {
        pub row_id: Option<i32>,
        pub process_id: String,
        pub scheduler_row_id: i32
    }

    pub struct Scheduler {
        pub row_id: Option<i32>,
        pub url: String
    }
    
    pub fn route_from_item(deps: Arc<Deps>, data_item: Vec<u8>) -> Result<String, String> {

        Ok("".to_string())
    }

    pub fn route_from_string(deps: Arc<Deps>, process_id: String) -> Result<String, String> {

        Ok("".to_string())
    }
}