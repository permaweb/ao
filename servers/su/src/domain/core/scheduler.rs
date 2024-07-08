use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use base64_url;
use dashmap::DashMap;
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;

use crate::domain::core::dal::{DataStore, Log, ScheduleProvider};

pub struct SchedulerDeps {
    pub data_store: Arc<dyn DataStore>,
    pub logger: Arc<dyn Log>,
}

/*
    information used to build a proper item
    in the schedule aka the proper tags
*/
pub struct ScheduleInfo {
    pub epoch: i32,
    pub nonce: i32,
    pub timestamp: i64,
    pub hash_chain: String,
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
    deps: Arc<SchedulerDeps>,
}

impl ProcessScheduler {
    pub fn new(deps: Arc<SchedulerDeps>) -> Self {
        ProcessScheduler {
            locks: Arc::new(DashMap::new()),
            deps,
        }
    }

    /*
        acquire the lock while also obtaining
        the info needed epoch, nonce etc.. to
        build a valid item in the schedule
    */
    pub async fn acquire_lock(&self, id: String) -> Result<LockedScheduleInfo, String> {
        let locked_schedule_info = {
            self.locks
                .entry(id.clone())
                .or_insert_with(|| {
                    Arc::new(Mutex::new(ScheduleInfo {
                        epoch: 0,
                        nonce: 0,
                        timestamp: 0,
                        hash_chain: String::new(),
                    }))
                })
                .value()
                .clone() // Clone the Arc here
        };

        Ok(locked_schedule_info)
    }

    pub async fn update_schedule_info<'a>(
        &'a self,
        schedule_info: &'a mut ScheduleInfo,
        id: String,
    ) -> Result<&mut ScheduleInfo, String> {
        let (current_epoch, current_nonce, current_hash_chain, current_timestamp) =
            match fetch_values(self.deps.clone(), &id).await {
                Ok(vals) => vals,
                Err(e) => return Err(format!("error acquiring scheduler lock {}", e)),
            };
        schedule_info.epoch = current_epoch;
        schedule_info.nonce = current_nonce;
        schedule_info.hash_chain = current_hash_chain;
        schedule_info.timestamp = current_timestamp;
        Ok(schedule_info)
    }
}

pub trait DecodeHash: Sized {
    fn from(base64_url_string: &str) -> Result<Self, String>;
    fn empty() -> Self;
}

impl DecodeHash for [u8; 32] {
    fn from(base64_url_string: &str) -> Result<Self, String> {
        base64_url::decode(base64_url_string)
            .map_err(|e| e.to_string())
            .and_then(|bytes| {
                bytes
                    .try_into()
                    .map_err(|_| format!("Length mismatch 32 - {base64_url_string}"))
            })
    }

    fn empty() -> Self {
        [0u8; 32]
    }
}

fn gen_hash_chain(
    previous_or_seed: &str,
    previous_message_id: Option<&str>,
) -> Result<String, String> {
    let mut hasher = Sha256::new();

    let prev_bytes: [u8; 32] = match DecodeHash::from(previous_or_seed) {
        Ok(pb) => pb,
        Err(e) => return Err(e),
    };

    match previous_message_id {
        Some(id) => {
            let id_bytes: [u8; 32] = match DecodeHash::from(id) {
                Ok(idb) => idb,
                Err(e) => return Err(e),
            };
            hasher.update(id_bytes);
        }
        None => (),
    }

    hasher.update(prev_bytes);

    let result = hasher.finalize();

    Ok(base64_url::encode(&result))
}

/*
    retrieve the epoch, nonce, hash_chain and timestamp
    increment the values here because this wont be called
    again until the lock is released.
*/
async fn fetch_values(
    deps: Arc<SchedulerDeps>,
    process_id: &String,
) -> Result<(i32, i32, String, i64), String> {
    let start_time = SystemTime::now();
    let duration = match start_time.duration_since(UNIX_EPOCH) {
        Ok(d) => d,
        Err(e) => return Err(format!("{:?}", e)),
    };
    let millis: i64 = duration.as_secs() as i64 * 1000 + i64::from(duration.subsec_millis());


    let start_total = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    let latest_message = match deps.data_store.get_latest_message(process_id) {
        Ok(m) => m,
        Err(e) => return Err(format!("{:?}", e)),
    };
    let end_get_latest_message = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    deps.logger.log(format!("=== get_latest_message - {:?}", (end_get_latest_message - start_total)));


    match latest_message {
        Some(previous_message) => {
            let epoch = previous_message.epoch().unwrap();
            let nonce = previous_message.nonce().unwrap() + 1;
            let hash_chain = gen_hash_chain(
                &previous_message.hash_chain().unwrap(),
                Some(&previous_message.assignment_id().unwrap()),
            )?;
            let end_hash_chain = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
            deps.logger.log(format!("=== end_hash_chain - {:?}", (end_hash_chain - end_get_latest_message)));
            Ok((epoch, nonce, hash_chain, millis))
        }
        None => {
            let hash_chain = gen_hash_chain(&process_id, None)?;
            Ok((0, 0, hash_chain, millis))
        }
    }
}

impl ScheduleProvider for ScheduleInfo {
    fn epoch(&self) -> String {
        self.epoch.to_string()
    }

    fn nonce(&self) -> String {
        self.nonce.to_string()
    }

    fn timestamp(&self) -> String {
        self.timestamp.to_string()
    }

    fn hash_chain(&self) -> String {
        self.hash_chain.to_string()
    }
}
