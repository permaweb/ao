use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;

use crate::domain::clients::store::{StoreClient};
use crate::domain::core::dal::{ScheduleProvider, Log};
use crate::config::Config;

pub struct SchedulerDeps {
    pub data_store: Arc<StoreClient>,
    pub logger: Arc<dyn Log>,
    pub config: Arc<Config>
}

/*
    information used to build a proper item
    in the schedule aka the proper tags
*/
pub struct ScheduleInfo {
    pub epoch: i32,
    pub nonce: i32,
    pub timestamp: i64,
    pub last_hash: String,
}

pub type LockedScheduleInfo = Arc<Mutex<ScheduleInfo>>;

/*
    ProcessScheduler provides a Mutex lock per process to 
    ensure there are no conflicts or missing nonces in the sequence
*/
pub struct ProcessScheduler {
    /*
        utilize DashMap to avoid locking up the 
        top level data structure
    */
    locks: Arc<DashMap<String, LockedScheduleInfo>>,
    deps: Arc<SchedulerDeps>
}

impl ProcessScheduler {
    pub fn new(deps: Arc<SchedulerDeps>) -> Self {
        ProcessScheduler {
            locks: Arc::new(DashMap::new()),
            deps
        }
    }

    /*
        acquire the lock while also obtaining
        the info needed epoch, nonce etc.. to 
        build a valid item in the schedule
    */
    pub async fn acquire_lock(&self, id: String) -> LockedScheduleInfo {
        let locked_schedule_info = {
            self.locks.entry(id.clone()).or_insert_with(|| {
                Arc::new(Mutex::new(ScheduleInfo {
                    epoch: 0,
                    nonce: 0,
                    timestamp: 0,
                    last_hash: String::new(),
                }))
            }).value().clone() // Clone the Arc here
        };

        // Update the ScheduleInfo in a separate scope to ensure the lock is released
        {
            let mut schedule_info = locked_schedule_info.lock().await;
            let (current_epoch, current_nonce, current_last_hash) = fetch_values(self.deps.clone(), &id).await;
            schedule_info.epoch = current_epoch + 1;
            schedule_info.nonce = current_nonce + 1;
            schedule_info.last_hash = current_last_hash;
            schedule_info.timestamp = 10; 
        } // The lock is released here

        locked_schedule_info
    }
}

/*
    retrieve the last epoch, nonce, and hash
    so they can be incremented later
*/
async fn fetch_values(deps: Arc<SchedulerDeps>, id: &String) -> (i32, i32, String) {
    let epoch = 0;       
    let nonce = 0;       
    let last_hash = String::from("dummy_hash"); 

    (epoch, nonce, last_hash)
}

impl ScheduleProvider for ScheduleInfo {
    fn epoch(&self) -> String {
        "epoch".to_string()
    }

    fn nonce(&self) -> String {
        "nonce".to_string()
    }

    fn timestamp(&self) -> String {
        "timestamp".to_string()
    }

    fn last_hash(&self) -> String {
        "hash".to_string()
    }
}