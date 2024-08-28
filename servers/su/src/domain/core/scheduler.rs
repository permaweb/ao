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
#[derive(Clone, Debug)]
pub struct ScheduleInfo {
    pub epoch: i32,
    pub nonce: i32,
    pub timestamp: i64,
    pub hash_chain: String,
}

#[derive(Clone)]
pub struct CachedScheduleInfo {
    pub schedule_info: ScheduleInfo,
    pub previous_assignment: Option<String>,
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
    cache: Arc<DashMap<String, CachedScheduleInfo>>,
}

impl ProcessScheduler {
    pub fn new(deps: Arc<SchedulerDeps>) -> Self {
        ProcessScheduler {
            locks: Arc::new(DashMap::new()),
            deps,
            cache: Arc::new(DashMap::new()),
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

    /*
      Commit the schedule info change to the locked mutable
      reference, this way we can determine the code using
      this module exactly if and when we want to incorporate
      the change ot the scheduling info.

      That was if there is an error the change wont be
      committed before releasing the lock and there wont
      be missing Nonces etc...
    */
    pub fn commit<'a>(
        &'a self,
        schedule_info: &'a mut ScheduleInfo,
        next_schedule_info: &ScheduleInfo,
        id: String,
        previous_assignment: String,
    ) -> Result<&mut ScheduleInfo, String> {
        schedule_info.epoch = next_schedule_info.epoch;
        schedule_info.nonce = next_schedule_info.nonce;
        schedule_info.hash_chain = next_schedule_info.hash_chain.clone();
        schedule_info.timestamp = next_schedule_info.timestamp;

        let cached_info = CachedScheduleInfo {
            schedule_info: schedule_info.clone(),
            previous_assignment: Some(previous_assignment),
        };

        self.cache.insert(id.clone(), cached_info);

        Ok(schedule_info)
    }

    /*
      Get the incremented scheduling info for a Process.
      We pass te metable reference to schedule info to
      help ensure the user has the lock.

      Although there is a way around this by defining your
      own mutable reference to ScheduleInfor. You wont be
      able to commit to a reference that is guarded by
      a lock unless you have obtained one via acquire_lock.
    */
    pub async fn increment<'a>(
        &'a self,
        _schedule_info: &'a mut ScheduleInfo,
        id: String,
    ) -> Result<ScheduleInfo, String> {
        let timestamp = Self::current_system_time();
        let (epoch, nonce, hash_chain) = if let Some(cached_info) = self.cache.get(&id) {
            // Use the cached info but still increment nonce and regenerate hash_chain
            let new_nonce = cached_info.schedule_info.nonce + 1;

            let assignment = cached_info.previous_assignment.clone();

            let new_hash_chain =
                gen_hash_chain(&cached_info.schedule_info.hash_chain, assignment.as_deref())?;

            (cached_info.schedule_info.epoch, new_nonce, new_hash_chain)
        } else {
            let latest_message = match self.deps.data_store.get_latest_message(&id) {
                Ok(m) => m,
                Err(e) => return Err(format!("{:?}", e)),
            };

            match latest_message {
                Some(previous_message) => {
                    let epoch = previous_message.epoch().unwrap();
                    let nonce = previous_message.nonce().unwrap() + 1;
                    let hash_chain = gen_hash_chain(
                        &previous_message.hash_chain().unwrap(),
                        Some(&previous_message.assignment_id().unwrap()),
                    )?;
                    (epoch, nonce, hash_chain)
                }
                None => {
                    /*
                      The hash chain will be seeded with the process_id
                      for the first message
                    */
                    let hash_chain = gen_hash_chain(&id, None)?;
                    (0 as i32, 0 as i32, hash_chain)
                }
            }
        };

        Ok(ScheduleInfo {
            epoch,
            nonce,
            hash_chain,
            timestamp,
        })
    }

    fn current_system_time() -> i64 {
        let start_time = SystemTime::now();
        let duration = start_time.duration_since(UNIX_EPOCH).unwrap();
        duration.as_secs() as i64 * 1000 + i64::from(duration.subsec_millis())
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
