use super::super::core::dal::{
    DataStore, Log, Message, PaginatedMessages, Process, StoreErrorType,
};
use super::super::SuLog;
use crate::domain::config::AoConfig;
use async_trait::async_trait;
use rocksdb::{Options, DB};
use std::sync::Arc;

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

        let prefix_extractor = rocksdb::SliceTransform::create("id_extractor", 
            |key| {
                // Find the first and second colon and return the id part
                if let Some(first_colon_pos) = key.iter().position(|&b| b == b':') {
                    if let Some(second_colon_pos) = key[first_colon_pos + 1..].iter().position(|&b| b == b':') {
                        &key[first_colon_pos + 1..first_colon_pos + 1 + second_colon_pos]
                    } else {
                        &key[first_colon_pos + 1..] // If no second colon, return rest of the key
                    }
                } else {
                    key // Return the entire key if no colon is found
                }
            },
            None // Optional in-domain function for validating if the key is within the domain
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
}

#[async_trait]
impl DataStore for LocalStoreClient {
    fn save_process(&self, process: &Process, bundle: &[u8]) -> Result<String, StoreErrorType> {
        let process_id = &process.process.process_id;
        let assignment_id = process.assignment_id()?;
        let timestamp = process.timestamp()?;
        let epoch = process.epoch()?;
        let nonce = process.nonce()?;

        // Store the process data by assignment_id (main key)
        let assignment_key = format!("process_assignments:{}", assignment_id);
        let process_data = serde_json::to_string(process)?;

        // Save the process data by assignment_id
        self.index_db
            .put(assignment_key.as_bytes(), process_data.as_bytes())?;

        // Save by process_id, but only store a reference to the assignment_id
        let process_key = format!("process:{}", process_id);
        self.index_db
            .put(process_key.as_bytes(), assignment_id.as_bytes())?;

        // Store by process_id, epoch, nonce, and timestamp, storing a reference to assignment_id
        let process_order_key = format!(
            "processes:{}:{}:{}:{}:{}",
            process_id, epoch, nonce, timestamp, assignment_id
        );

        self.index_db
            .put(process_order_key.as_bytes(), assignment_id.as_bytes())?;

        // Store the binary bundle in file_db (by assignment_id)
        self.file_db
            .put(assignment_key.as_bytes(), bundle)?;

        Ok("Process saved".to_string())
    }

    async fn get_process(&self, tx_id: &str) -> Result<Process, StoreErrorType> {
        // First, try to fetch the process by assignment_id directly
        let assignment_key = format!("process_assignments:{}", tx_id);
        if let Some(process_data) = self.index_db.get(assignment_key.as_bytes())? {
            // Found the process by assignment_id, deserialize and return it
            let process: Process = serde_json::from_slice(&process_data)?;
            return Ok(process);
        }
    
        // If not found by assignment_id, assume tx_id is a process_id
        let process_key = format!("process:{}", tx_id);
        if let Some(assignment_id_bytes) = self.index_db.get(process_key.as_bytes())? {
            let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;
    
            // Now fetch the process by assignment_id
            let assignment_key = format!("process_assignments:{}", assignment_id);
            if let Some(process_data) = self.index_db.get(assignment_key.as_bytes())? {
                let process: Process = serde_json::from_slice(&process_data)?;
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

        // Store the message data in the index_db, keyed by assignment_id (main key)
        let assignment_key = format!("assignments:{}", assignment_id);
        let message_data = serde_json::to_string(message)?;

        // Save the actual message data by assignment_id (main unique key)
        self.index_db
            .put(assignment_key.as_bytes(), message_data.as_bytes())?;

        // Save by message_id, but only store a reference to the assignment_id
        let message_composite_key = format!("messages:{}:{}", message_id, assignment_id);
        self.index_db
            .put(message_composite_key.as_bytes(), assignment_id.as_bytes())?;

        // Store by process_id, epoch, nonce, and timestamp, storing a reference to assignment_id
        let process_order_key = format!(
            "process_messages:{}:{}:{}:{}:{}",
            process_id, epoch, nonce, timestamp, assignment_id
        );
        self.index_db
            .put(process_order_key.as_bytes(), assignment_id.as_bytes())?;

        // Store the binary bundle in file_db (by assignment_id)
        self.file_db
            .put(assignment_key.as_bytes(), bundle_in)?;

        Ok("Message saved".to_string())
    }

    fn get_message(&self, tx_id: &str) -> Result<Message, StoreErrorType> {
        // Try to fetch the message directly by assignment_id
        let assignment_key = format!("assignments:{}", tx_id);
        if let Some(message_data) = self.index_db.get(assignment_key.as_bytes())? {
            // Found the message by assignment_id, deserialize and return it
            let message: Message = serde_json::from_slice(&message_data)?;
            return Ok(message);
        }
    
        // If not found by assignment_id, assume tx_id is a message_id
        let message_key_prefix = format!("messages:{}:", tx_id);
        let mut iter = self.index_db.prefix_iterator(message_key_prefix.as_bytes());
    
        // Look for the assignment_id for this message_id
        if let Some(result) = iter.next() {
            let (key, assignment_id_bytes) = result?;
            let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;
    
            // Now fetch the message by assignment_id
            let assignment_key = format!("assignments:{}", assignment_id);
            if let Some(message_data) = self.index_db.get(assignment_key.as_bytes())? {
                let message: Message = serde_json::from_slice(&message_data)?;
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
    
        let process_key_prefix = format!("process_messages:{}:", process_id);
    
        // Use an iterator to scan through the keys for the Process
        let iter = self.index_db.prefix_iterator(process_key_prefix.as_bytes());
    
        let mut keys_with_ids = Vec::new();
    
        // Collect all keys into memory
        for item in iter {
            let (key, assignment_id_bytes) = item?;
            let key_str = String::from_utf8(key.to_vec())?;
    
            // Extract nonce, epoch, and timestamp from the key for sorting
            let parts: Vec<&str> = key_str.split(':').collect();
            if parts.len() >= 4 {
                // Store the key along with the assignment_id
                let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;
                keys_with_ids.push((key_str, assignment_id));
            }
        }
    
        // Sort the keys by epoch, nonce, and timestamp
        keys_with_ids.sort_by(|(key_a, _), (key_b, _)| {
            let parts_a: Vec<&str> = key_a.split(':').collect();
            let parts_b: Vec<&str> = key_b.split(':').collect();
            
            // Assuming keys are formatted as "process_messages:<process_id>:<nonce>:<epoch>:<timestamp>"
            let epoch_a = parts_a.get(3).unwrap_or(&"0").parse::<i64>().unwrap_or(0);
            let nonce_a = parts_a.get(2).unwrap_or(&"0").parse::<i64>().unwrap_or(0);
            let timestamp_a = parts_a.get(4).unwrap_or(&"0").parse::<i64>().unwrap_or(0);
        
            let epoch_b = parts_b.get(3).unwrap_or(&"0").parse::<i64>().unwrap_or(0);
            let nonce_b = parts_b.get(2).unwrap_or(&"0").parse::<i64>().unwrap_or(0);
            let timestamp_b = parts_b.get(4).unwrap_or(&"0").parse::<i64>().unwrap_or(0);
        
            // Compare as integers
            epoch_a
                .cmp(&epoch_b)
                .then(nonce_a.cmp(&nonce_b))
                .then(timestamp_a.cmp(&timestamp_b))
        });
    
        // Apply pagination by slicing the sorted keys
        let start_index = 0;
        let end_index = actual_limit.min(keys_with_ids.len());
        let paginated_keys: Vec<(String, String)> = keys_with_ids[start_index..end_index].to_vec();
    
        // Fetch the messages for each paginated key
        for (_, assignment_id) in paginated_keys {
            let message = self.get_message(&assignment_id)?;
            messages.push(message);
        }
    
        // Determine if there's a next page
        let has_next_page = keys_with_ids.len() > actual_limit;
    
        // Return the paginated result with the calculated `has_next_page`
        Ok(PaginatedMessages::from_messages(messages, has_next_page)?)
    }
  
  

    fn get_latest_message(&self, process_id: &str) -> Result<Option<Message>, StoreErrorType> {
        // Create the prefix key to search for messages by process_id
        let prefix_key = format!("process_messages:{}:", process_id);
        
        // Use a prefix iterator to scan through messages in sequential order
        let mut iter = self.index_db.prefix_iterator(prefix_key.as_bytes());
        
        let mut latest_message: Option<Message> = None;
        
        // Iterate through all the messages and get the last one
        for result in iter {
            let (_key, assignment_id_bytes) = result?;
            
            // Fetch the message by assignment_id
            let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;
            latest_message = Some(self.get_message(&assignment_id)?);
        }
        
        // Return the latest message if found
        Ok(latest_message)
    }
}
