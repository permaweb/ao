use std::sync::Arc;

use async_trait::async_trait;
use rocksdb::{Options, DB};
use tokio::time::{sleep, Duration};

use super::super::super::core::dal::{
    DataStore, Log, Message, PaginatedMessages, Process, StoreErrorType,
};
use super::super::super::SuLog;

// test that retrieval order is not effected by concurrent writes
// fetch_message_range should cache in memory and seek from there

pub struct LocalStoreClient {
    _logger: Arc<dyn Log>,
    /*
      A RocksDB instance that is a key value store
      of ANS-104 bundles, only public for migration
      purposes
    */
    pub file_db: DB,
    /*
      A RocksDB instance that is split into column families
      and is an index for querying and ordering of Process's
      and Messages, only public for migration purposes
    */
    pub index_db: DB,
}

impl From<rocksdb::Error> for StoreErrorType {
    fn from(err: rocksdb::Error) -> StoreErrorType {
        StoreErrorType::DatabaseError(format!("RocksDB error: {:?}", err))
    }
}

impl LocalStoreClient {
    pub fn new(file_db_dir: &String, index_db_dir: &String) -> Result<Self, StoreErrorType> {
        let logger = SuLog::init();

        let mut opts = Options::default();
        opts.create_if_missing(true);
        opts.set_enable_blob_files(true);
        opts.set_blob_file_size(5 * 1024 * 1024 * 1024); // 5GB max

        /*
          This low value makes it so pretty much all
          the values are stored in blobs on the file db
        */
        opts.set_min_blob_size(1024);

        let file_db = DB::open(&opts, file_db_dir)?;

        let mut opts_index = Options::default();
        opts_index.create_if_missing(true);
        opts_index.create_missing_column_families(true);

        let cfs = LocalStoreClient::generate_cfs();

        let index_db = match DB::open_cf_with_opts(&opts_index, &index_db_dir, cfs) {
            Ok(_db) => _db,
            Err(e) => panic!("failed to open cf with options: {}", e),
        };

        Ok(LocalStoreClient {
            _logger: logger,
            file_db,
            index_db,
        })
    }

    /*
      Generate a column family for each prefix type in the index. This
      allows us to query them all seperately without conflicting results.

      When a key value is saved, the prefix up to the colon after
      the first id, which all of the prefixes have, Will be extracted
      for use in prefix seeking later.
    */
    fn generate_cfs() -> Vec<(String, Options)> {
        /*
          Prefix extractor for the up to the id portion of the key
          this can be shared because all the different key
          types are seperated into column families so we can prefix
          query within the column family without getting conflicting
          results (process popping up in messages query for example)
        */
        let up_to_id_extractor = rocksdb::SliceTransform::create(
            "up_to_id_extractor",
            |key| {
                if let Some(first_colon_pos) = key.iter().position(|&b| b == b':') {
                    if let Some(second_colon_pos) =
                        key[first_colon_pos + 1..].iter().position(|&b| b == b':')
                    {
                        &key[..first_colon_pos + 1 + second_colon_pos + 1]
                    } else {
                        &[]
                    }
                } else {
                    &[]
                }
            },
            None,
        );

        let mut opts_index = Options::default();
        opts_index.set_prefix_extractor(up_to_id_extractor);

        vec![
            ("process".to_string(), opts_index.clone()),
            ("process_ordering".to_string(), opts_index.clone()),
            ("message".to_string(), opts_index.clone()),
            ("message_ordering".to_string(), opts_index.clone()),
        ]
    }

    /*
      Helper methods to generate keys in the index
      and file dbs. Processes and Messages have different
      prefixes on their keys and similar structures
    */

    fn proc_composite_key(&self, process_id: &str, assignment_id: &str) -> String {
        format!("process:{}:{}", process_id, assignment_id)
    }

    fn proc_assignment_key(&self, assignment_id: &str) -> String {
        format!("process_assignment:{}", assignment_id)
    }

    fn proc_order_key(&self, process: &Process) -> Result<String, StoreErrorType> {
        let process_id = &process.process.process_id;
        let assignment_id = process.assignment_id()?;
        let timestamp = process.timestamp()?;
        let epoch = process.epoch()?;
        let nonce = process.nonce()?;

        Ok(format!(
            "process_ordering:{}:{:010}:{:010}:{:015}:{}",
            process_id, epoch, nonce, timestamp, assignment_id
        ))
    }

    fn msg_composite_key(&self, message_id: &str, assignment_id: &str) -> String {
        format!("message:{}:{}", message_id, assignment_id)
    }

    fn msg_assignment_key(&self, assignment_id: &str) -> String {
        format!("message_assignment:{}", assignment_id)
    }

    fn msg_order_key(&self, message: &Message) -> Result<String, StoreErrorType> {
        let process_id = message.process_id()?;
        let assignment_id = message.assignment_id()?;
        let timestamp = message.timestamp()?;
        let epoch = message.epoch()?;
        let nonce = message.nonce()?;

        Ok(format!(
            "message_ordering:{}:{:010}:{:010}:{:015}:{}",
            process_id, epoch, nonce, timestamp, assignment_id
        ))
    }

    /*
      This is the core method of this program used
      for querying message ranges for the /processid
      message list
    */
    async fn fetch_message_range(
        &self,
        process_id: &String,
        from: &Option<String>,
        to: &Option<String>,
        limit: &Option<usize>,
    ) -> Result<(Vec<(String, String)>, bool), StoreErrorType> {
        let process_key_prefix = format!("message_ordering:{}:", process_id);

        let cf = self.index_db.cf_handle("message_ordering").ok_or_else(|| {
            StoreErrorType::DatabaseError("Column family 'message_ordering' not found".to_string())
        })?;

        let iter = self
            .index_db
            .prefix_iterator_cf(cf, process_key_prefix.as_bytes());

        let mut paginated_keys = Vec::new();
        let mut has_next_page = false;
        let mut count = 0;

        for item in iter {
            let (key, assignment_id_bytes) = item?;
            let key_str = String::from_utf8(key.to_vec())?;
            let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;

            /*
              Extract the timestamp out of the key for comparison
              with the from/to parameters
            */
            let parts: Vec<&str> = key_str.split(':').collect();
            if parts.len() < 4 {
                continue;
            }

            let timestamp_str = parts[4];
            let timestamp = timestamp_str.parse::<i64>().unwrap_or(0);

            /*
              Application of the from and to parameters
              from is exclusive while to is inclusive
            */
            if let Some(ref from_str) = from {
                if let Ok(from_timestamp) = from_str.parse::<i64>() {
                    if timestamp <= from_timestamp {
                        continue;
                    }
                }
            }

            if let Some(ref to_str) = to {
                if let Ok(to_timestamp) = to_str.parse::<i64>() {
                    if timestamp > to_timestamp {
                        has_next_page = true;
                        break;
                    }
                }
            }

            paginated_keys.push((key_str.clone(), assignment_id));
            count += 1;

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
    /*
      Index and save a process, currently we dont
      use the process index for anything but building
      it here to remain consistent with how messages
      are saved
    */
    fn save_process(&self, process: &Process, bundle: &[u8]) -> Result<String, StoreErrorType> {
        let process_id = &process.process.process_id;
        let assignment_id = process.assignment_id()?;

        let cf = self.index_db.cf_handle("process").ok_or_else(|| {
            StoreErrorType::DatabaseError("Column family 'process' not found".to_string())
        })?;

        let process_key = self.proc_composite_key(process_id, &assignment_id);
        self.index_db
            .put_cf(cf, process_key.as_bytes(), assignment_id.as_bytes())?;

        let cf = self.index_db.cf_handle("process_ordering").ok_or_else(|| {
            StoreErrorType::DatabaseError("Column family 'process_ordering' not found".to_string())
        })?;

        let process_order_key = self.proc_order_key(process)?;
        self.index_db
            .put_cf(cf, process_order_key.as_bytes(), assignment_id.as_bytes())?;

        let assignment_key = self.proc_assignment_key(&assignment_id);
        self.file_db.put(assignment_key.as_bytes(), bundle)?;

        Ok("Process saved".to_string())
    }

    /*
      Index and save a Message, the index is used
      for fast message list and individual message
      retrieval. The file_db key value is used
      to store and retrieve the actual bundle.
    */
    async fn save_message(
        &self,
        message: &Message,
        bundle_in: &[u8],
    ) -> Result<String, StoreErrorType> {
        let message_id = message.message_id()?;
        let assignment_id = message.assignment_id()?;

        let cf = self.index_db.cf_handle("message").ok_or_else(|| {
            StoreErrorType::DatabaseError("Column family 'message' not found".to_string())
        })?;

        let message_composite_key = self.msg_composite_key(&message_id, &assignment_id);
        self.index_db.put_cf(
            cf,
            message_composite_key.as_bytes(),
            assignment_id.as_bytes(),
        )?;

        let cf = self.index_db.cf_handle("message_ordering").ok_or_else(|| {
            StoreErrorType::DatabaseError("Column family 'message_ordering' not found".to_string())
        })?;

        let msg_order_key = self.msg_order_key(message)?;
        self.index_db
            .put_cf(cf, msg_order_key.as_bytes(), assignment_id.as_bytes())?;

        let assignment_key = self.msg_assignment_key(&assignment_id);
        self.file_db.put(assignment_key.as_bytes(), bundle_in)?;

        Ok("Message saved".to_string())
    }

    async fn get_process(&self, tx_id: &str) -> Result<Process, StoreErrorType> {
        let assignment_key = self.proc_assignment_key(tx_id);
        if let Some(process_bundle) = self.file_db.get(assignment_key.as_bytes())? {
            return Ok(Process::from_bytes(process_bundle)?);
        }

        /*
          If not found by assignment_id, assume tx_id is a
          message id. We fetch its assignment id by
          message id and then fetch the bundle with that

          There is no key that only contains message id. This
          is because a message can be assignmed many times. So
          here we use prefix iteration to find the correct message
        */
        let cf = self.index_db.cf_handle("process").ok_or_else(|| {
            StoreErrorType::DatabaseError("Column family 'process' not found".to_string())
        })?;
        let process_key_prefix = format!("process:{}:", tx_id);
        let mut iter = self
            .index_db
            .prefix_iterator_cf(cf, process_key_prefix.as_bytes());

        if let Some(result) = iter.next() {
            let (_key, assignment_id_bytes) = result?;
            let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;
            let assignment_key = self.proc_assignment_key(&assignment_id);
            if let Some(process_bundle) = self.file_db.get(assignment_key.as_bytes())? {
                return Ok(Process::from_bytes(process_bundle)?);
            }
        }

        Err(StoreErrorType::NotFound("Process not found".to_string()))
    }

    fn get_message(&self, tx_id: &str) -> Result<Message, StoreErrorType> {
        let assignment_key = self.msg_assignment_key(tx_id);
        if let Some(message_bundle) = self.file_db.get(assignment_key.as_bytes())? {
            let message: Message = Message::from_bytes(message_bundle)?;
            return Ok(message);
        }

        /*
          If not found by assignment_id, assume tx_id is a
          message id. We fetch its assignment id by
          message id and then fetch the bundle with that

          There is no key that only contains message id. This
          is because a message can be assignmed many times. So
          here we use prefix iteration to find the correct message
        */
        let cf = self.index_db.cf_handle("message").ok_or_else(|| {
            StoreErrorType::DatabaseError("Column family 'message' not found".to_string())
        })?;
        let message_key_prefix = format!("message:{}:", tx_id);
        let mut iter = self
            .index_db
            .prefix_iterator_cf(cf, message_key_prefix.as_bytes());

        if let Some(result) = iter.next() {
            let (_key, assignment_id_bytes) = result?;
            let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;
            let assignment_key = self.msg_assignment_key(&assignment_id);
            if let Some(message_bundle) = self.file_db.get(assignment_key.as_bytes())? {
                let message: Message = Message::from_bytes(message_bundle)?;
                return Ok(message);
            }
        }

        Err(StoreErrorType::NotFound("Message not found".to_string()))
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

    /*
      Message list retrieval for the /processid
      query, this returns a paginated list of messages
      if a process has an assignment it will be included
      as the first message in the list.
    */
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

        /*
          Check if the process has an assignment and
          should be included as the first message
        */
        let include_process = process_in.assignment.is_some()
            && match from {
                Some(ref from_nonce) => from_nonce == &process_in.nonce()?.to_string(),
                /*
                  No 'from' means it's the first page
                */
                None => true,
            };

        if include_process {
            let process_message = Message::from_process(process_in.clone())?;
            messages.push(process_message);
            /*
              Adjust the limit since the process itself
              is the first message
            */
            actual_limit -= 1;
        }

        let (paginated_keys, has_next_page) = self
            .fetch_message_range(process_id, from, to, &Some(actual_limit))
            .await?;

        /*
          Fetch the messages for each paginated key. This
          will go to the file_db to extract the actual
          message data
        */
        for (_, assignment_id) in paginated_keys {
            let assignment_key = self.msg_assignment_key(&assignment_id);

            for _ in 0..10 {
                if let Some(message_data) = self.file_db.get(assignment_key.as_bytes())? {
                    let message: Message = Message::from_bytes(message_data)?;
                    messages.push(message);
                    break;
                } else {
                    sleep(Duration::from_millis(100)).await;
                }
            }
        }

        Ok(PaginatedMessages::from_messages(messages, has_next_page)?)
    }

    /*
      Retrieve the lates message for a process.
      Currently this is only run once for a process
      per run of the su so it isn't very efficient
      were pulling all the message keys into memory and
      picking the latest one.
    */
    async fn get_latest_message(
        &self,
        process_id: &str,
    ) -> Result<Option<Message>, StoreErrorType> {
        let (paginated_keys, _) = self
            .fetch_message_range(&process_id.to_string(), &None, &None, &None)
            .await?;

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
