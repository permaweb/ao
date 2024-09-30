use async_trait::async_trait;
use rocksdb::{Options, DB};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

use super::super::core::dal::{
    DataStore, Log, Message, PaginatedMessages, Process, StoreErrorType,
};
use super::super::SuLog;
use crate::domain::config::AoConfig;

pub struct LocalStoreClient {
    logger: Arc<dyn Log>,
    /*
      A RocksDB instance that is a key value store
      of ANS-104 bundles
    */
    file_db: DB,
    /*
      A RocksDB instance that is an index for querying
      and ordering of Process's and Messages
    */
    index_db: DB,
}

impl From<serde_json::Error> for StoreErrorType {
    fn from(error: serde_json::Error) -> Self {
        StoreErrorType::JsonError(format!("data store json error: {}", error))
    }
}

impl From<StoreErrorType> for String {
    fn from(error: StoreErrorType) -> Self {
        format!("{:?}", error)
    }
}

impl From<String> for StoreErrorType {
    fn from(error: String) -> Self {
        StoreErrorType::DatabaseError(format!("{:?}", error))
    }
}

impl From<rocksdb::Error> for StoreErrorType {
    fn from(err: rocksdb::Error) -> StoreErrorType {
        StoreErrorType::DatabaseError(format!("RocksDB error: {:?}", err))
    }
}

impl From<std::string::FromUtf8Error> for StoreErrorType {
    fn from(err: std::string::FromUtf8Error) -> StoreErrorType {
        StoreErrorType::JsonError(format!("UTF-8 conversion error: {:?}", err))
    }
}

impl LocalStoreClient {
    pub fn new() -> Result<Self, StoreErrorType> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
        let logger = SuLog::init();

        let mut opts = Options::default();
        opts.create_if_missing(true);
        opts.set_enable_blob_files(true);
        opts.set_blob_file_size(5 * 1024 * 1024 * 1024); // 5GB max
        opts.set_min_blob_size(1024); // Low value ensures it is used

        let file_db = DB::open(&opts, &config.su_file_db_dir)?;

        let prefix_extractor = rocksdb::SliceTransform::create(
            "id_extractor",
            |key| {
                // Find the first and second colon and return the id part
                if let Some(first_colon_pos) = key.iter().position(|&b| b == b':') {
                    if let Some(second_colon_pos) =
                        key[first_colon_pos + 1..].iter().position(|&b| b == b':')
                    {
                        &key[first_colon_pos + 1..first_colon_pos + 1 + second_colon_pos]
                    } else {
                        &key[first_colon_pos + 1..] // If no second colon, return rest of the key
                    }
                } else {
                    key // Return the entire key if no colon is found
                }
            },
            None, // Optional in-domain function for validating if the key is within the domain
        );

        let mut opts_index = Options::default();
        opts_index.create_if_missing(true);
        opts_index.set_prefix_extractor(prefix_extractor);

        let index_db = DB::open(&opts_index, &config.su_index_db_dir)?;

        Ok(LocalStoreClient {
            logger,
            file_db,
            index_db,
        })
    }

    fn fetch_message_range(
        &self,
        process_id: &String,
        from: &Option<String>,
        to: &Option<String>,
        limit: &Option<usize>,
    ) -> Result<(Vec<(String, String)>, bool), StoreErrorType> {
        let process_key_prefix = format!("process_messages:{}:", process_id);

        let iter = self.index_db.prefix_iterator(process_key_prefix.as_bytes());

        let mut paginated_keys = Vec::new();
        let mut has_next_page = false;
        let mut count = 0;

        for item in iter {
            let (key, assignment_id_bytes) = item?;
            let key_str = String::from_utf8(key.to_vec())?;
            let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;

            // Extract the nonce portion from the key
            let parts: Vec<&str> = key_str.split(':').collect();
            if parts.len() < 4 {
                continue; // Key format is not as expected, skip it
            }

            let nonce_str = parts[3]; // Assuming the nonce is at the 4th position (index 3)
            let nonce = nonce_str.parse::<i64>().unwrap_or(0); // Parse nonce as i64

            // Apply 'from' and 'to' filters by first parsing them into i64
            if let Some(ref from_str) = from {
                if let Ok(from_nonce) = from_str.parse::<i64>() {
                    if nonce <= from_nonce {
                        continue;
                    }
                }
            }

            if let Some(ref to_str) = to {
                if let Ok(to_nonce) = to_str.parse::<i64>() {
                    if nonce > to_nonce {
                        has_next_page = true;
                        break;
                    }
                }
            }

            paginated_keys.push((key_str, assignment_id));
            count += 1;

            // Check if we've reached the limit
            match limit {
                Some(actual_limit) => {
                    if count >= *actual_limit {
                        has_next_page = true;
                        break;
                    }
                }
                _ => (),
            };
        }

        Ok((paginated_keys, has_next_page))
    }
}

#[async_trait]
impl DataStore for LocalStoreClient {
    fn save_process(&self, process: &Process, bundle: &[u8]) -> Result<String, StoreErrorType> {
        let process_id = &process.process.process_id;
        let assignment_id = process.assignment_id()?;
        let timestamp = process.timestamp()?;
        let epoch = process.epoch()?;
        let nonce = process.nonce()?;

        // Save by process_id, but only store a reference to the assignment_id
        let process_key = format!("process:{}", process_id);
        self.index_db
            .put(process_key.as_bytes(), assignment_id.as_bytes())?;

        // Store by process_id, epoch, nonce, and timestamp, storing a reference to assignment_id
        let process_order_key = format!(
            "processes:{}:{:010}:{:010}:{:015}:{}",
            process_id, epoch, nonce, timestamp, assignment_id
        );

        self.index_db
            .put(process_order_key.as_bytes(), assignment_id.as_bytes())?;

        // Store the binary bundle in file_db (by assignment_id)
        let assignment_key = format!("process_assignments:{}", assignment_id);
        self.file_db.put(assignment_key.as_bytes(), bundle)?;

        Ok("Process saved".to_string())
    }

    async fn get_process(&self, tx_id: &str) -> Result<Process, StoreErrorType> {
        // First, try to fetch the process by assignment_id directly
        let assignment_key = format!("process_assignments:{}", tx_id);
        if let Some(process_bundle) = self.file_db.get(assignment_key.as_bytes())? {
            // Found the process by assignment_id, deserialize and return it
            let process: Process = Process::from_bytes(process_bundle)?;
            return Ok(process);
        }

        // If not found by assignment_id, assume tx_id is a process_id
        let process_key = format!("process:{}", tx_id);
        if let Some(assignment_id_bytes) = self.index_db.get(process_key.as_bytes())? {
            let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;

            // Now fetch the process by assignment_id
            let assignment_key = format!("process_assignments:{}", assignment_id);
            if let Some(process_bundle) = self.file_db.get(assignment_key.as_bytes())? {
                // Found the process by assignment_id, deserialize and return it
                let process: Process = Process::from_bytes(process_bundle)?;
                return Ok(process);
            }
        }

        Err(StoreErrorType::NotFound("Process not found".to_string()))
    }

    fn check_existing_message(&self, message_id: &String) -> Result<(), StoreErrorType> {
        if let Ok(_message) = self.get_message(message_id) {
            Err(StoreErrorType::MessageExists(
                "Message already exists".to_string(),
            ))
        } else {
            Ok(())
        }
    }

    async fn save_message(
        &self,
        message: &Message,
        bundle_in: &[u8],
    ) -> Result<String, StoreErrorType> {
        let process_id = message.process_id()?;
        let message_id = message.message_id()?;
        let assignment_id = message.assignment_id()?;
        let timestamp = message.timestamp()?;
        let epoch = message.epoch()?;
        let nonce = message.nonce()?;

        // Save by message_id, but only store a reference to the assignment_id
        let message_composite_key = format!("messages:{}:{}", message_id, assignment_id);
        self.index_db
            .put(message_composite_key.as_bytes(), assignment_id.as_bytes())?;

        // Store by process_id, epoch, nonce, and timestamp, storing a reference to assignment_id
        let process_order_key = format!(
            "process_messages:{}:{:010}:{:010}:{:015}:{}",
            process_id, epoch, nonce, timestamp, assignment_id
        );
        self.index_db
            .put(process_order_key.as_bytes(), assignment_id.as_bytes())?;

        // Store the binary bundle in file_db (by assignment_id)
        let assignment_key = format!("assignments:{}", assignment_id);
        self.file_db.put(assignment_key.as_bytes(), bundle_in)?;

        Ok("Message saved".to_string())
    }

    fn get_message(&self, tx_id: &str) -> Result<Message, StoreErrorType> {
        // Try to fetch the message directly by assignment_id
        let assignment_key = format!("assignments:{}", tx_id);
        if let Some(message_bundle) = self.file_db.get(assignment_key.as_bytes())? {
            let message: Message = Message::from_bytes(message_bundle)?;
            return Ok(message);
        }

        // If not found by assignment_id, assume tx_id is a message_id
        let message_key_prefix = format!("messages:{}:", tx_id);
        let mut iter = self.index_db.prefix_iterator(message_key_prefix.as_bytes());

        // Look for the assignment_id for this message_id
        if let Some(result) = iter.next() {
            let (_key, assignment_id_bytes) = result?;
            let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;

            // Now fetch the message by assignment_id
            let assignment_key = format!("assignments:{}", assignment_id);
            if let Some(message_bundle) = self.file_db.get(assignment_key.as_bytes())? {
                let message: Message = Message::from_bytes(message_bundle)?;
                return Ok(message);
            }
        }

        Err(StoreErrorType::NotFound("Message not found".to_string()))
    }

    async fn get_messages(
        &self,
        process_in: &Process,
        from: &Option<String>,
        to: &Option<String>,
        limit: &Option<i32>,
    ) -> Result<PaginatedMessages, StoreErrorType> {
        let process_id = &process_in.process.process_id;
        let limit_val = limit.unwrap_or(100) as usize;

        let mut messages = Vec::new();
        let mut actual_limit = limit_val;

        // Check if the process has an assignment and should be included as the first message
        let include_process = process_in.assignment.is_some()
            && match from {
                Some(ref from_nonce) => from_nonce == &process_in.nonce()?.to_string(),
                None => true, // No 'from' means it's the first page
            };

        if include_process {
            // Add the process as the first message
            let process_message = Message::from_process(process_in.clone())?;
            messages.push(process_message);
            actual_limit -= 1; // Adjust the limit since we're adding the process
        }

        let (paginated_keys, has_next_page) =
            self.fetch_message_range(process_id, from, to, &Some(actual_limit))?;

        // Fetch the messages for each paginated key
        for (_, assignment_id) in paginated_keys {
            let assignment_key = format!("assignments:{}", assignment_id);
            /*
              This loop is necessary because it may be that the index
              has been built but the message data hasnt finished writing
              yet.
            */
            for _ in 0..10 {
                if let Some(message_data) = self.index_db.get(assignment_key.as_bytes())? {
                    // Found the message by assignment_id, deserialize and return it
                    let message: Message = serde_json::from_slice(&message_data)?;
                    messages.push(message);
                    break;
                } else {
                    sleep(Duration::from_millis(100)).await;
                }
            }
        }

        // Return the paginated result with the calculated `has_next_page`
        Ok(PaginatedMessages::from_messages(messages, has_next_page)?)
    }

    /*
      Currently this is only running once for each process
      that is written to, so it doesn't need to be that
      efficient. So it is just pulling the index for the
      process into memory and grabbing the last one.
    */
    fn get_latest_message(&self, process_id: &str) -> Result<Option<Message>, StoreErrorType> {
        let (paginated_keys, _) =
            self.fetch_message_range(&process_id.to_string(), &None, &None, &None)?;

        if paginated_keys.len() < 1 {
            return Ok(None);
        }

        let (_, assignment_id) = match paginated_keys.last() {
            Some(l) => l.clone(),
            None => return Ok(None),
        };

        let latest_message = self.get_message(&assignment_id)?;

        Ok(Some(latest_message))
    }
}

pub mod migration {
    use std::{env, io};
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::time::{Duration, Instant};

    use futures::future::join_all;
    use tokio::task::JoinHandle;
    use tokio::time::interval;

    use super::super::store::StoreClient;

    pub async fn migrate_to_local() -> io::Result<()> {
        let start = Instant::now();
        let data_store = Arc::new(
          StoreClient::new_single_connection().expect("Failed to create StoreClient")
        );

        data_store
            .bytestore
            .try_read_instance_connect()
            .expect("Failed to connect to bytestore");

        let local_data_store = Arc::new(super::LocalStoreClient::new().expect("Failed to create LocalStoreClient"));

        let total_count = data_store
          .get_message_count()
          .expect("Failed to get message count");
    
        data_store.logger.log(format!("Total messages to process: {}", total_count));

        let processed_count = Arc::new(AtomicUsize::new(0));

        let processed_count_clone = Arc::clone(&processed_count);
        let data_store_c = Arc::clone(&data_store);
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(10));
            loop {
                interval.tick().await;
                data_store_c.logger.log(format!(
                    "Messages processed update: {}",
                    processed_count_clone.load(Ordering::SeqCst)
                ));
                if processed_count_clone.load(Ordering::SeqCst) >= total_count as usize {
                    break;
                }
            }
        });

        for batch_start in (0..total_count).step_by(20) {
            let batch_end = batch_start + 20 as i64;
    
            let data_store = Arc::clone(&data_store);
            let processed_count = Arc::clone(&processed_count);
    
            let result = data_store.get_all_messages_no_bundle(batch_start, Some(batch_end));
    
            match result {
                Ok(messages) => {
                    let mut save_handles: Vec<JoinHandle<()>> = Vec::new();
                    for message in messages {
                        let msg_id = message.0;
                        let assignment_id = message.1;
                        let process_id = message.2;
                        let timestamp = message.3;
                        let epoch = message.4;
                        let nonce = message.5;
                        let hash_chain = message.6;
                        let data_store = Arc::clone(&data_store);
                        let processed_count = Arc::clone(&processed_count);

                        let binary_key = (
                            msg_id.clone(),
                            assignment_id.clone(),
                            process_id.clone(),
                            timestamp.to_string().clone(),
                        );
    
                        let handle = tokio::spawn(async move {
                            // data_store
                            //     .bytestore
                            //     .clone()
                            //     .save_binary(
                            //         msg_id.clone(),
                            //         assignment_id.clone(),
                            //         process_id.clone(),
                            //         timestamp.clone(),
                            //         bundle,
                            //     )
                            //     .unwrap();
                            processed_count.fetch_add(1, Ordering::SeqCst);
                        });
    
                        save_handles.push(handle);
                    }
                    join_all(save_handles).await;
                }
                Err(e) => {
                    data_store
                        .logger
                        .error(format!("Error fetching messages: {:?}", e));
                }
            }
        }

        let duration = start.elapsed();
        data_store
            .logger
            .log(format!("Time elapsed in data migration is: {:?}", duration));
        
        Ok(())
    }
}
