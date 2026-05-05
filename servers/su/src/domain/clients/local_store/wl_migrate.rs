use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use tokio::sync::Semaphore;

use super::super::super::SuLog;
use super::super::super::config::AoConfig;
use super::super::super::core::dal::{DataStore, Log, Process, Message};
use super::super::store::StoreClient;
use super::super::whitelist::FileUrlWhitelist;
use super::store::LocalStoreClient;

const BATCH_SIZE: i64 = 500;

/*
  Number of processes to migrate concurrently. Each process
  gets its own tokio task but we limit how many run at once
  to avoid overwhelming postgres connection pools and memory.
*/
const CONCURRENT_PROCESSES: usize = 60;

/*
  Outcome of verifying the latest message in the local store
  for a given process. Used to determine where to resume
  migration from.
*/
enum ResumePoint {
    /*
      No messages exist in the local store for this process.
      Start migration from the beginning.
    */
    FromStart,
    /*
      The latest message was verified intact. Resume after
      the given timestamp.
    */
    AfterTimestamp(i64),
}

/*
  Migration errors are split into two categories:
  - LegacyMessage: a message without an assignment was found.
    The process is incompatible with the local store and must
    be removed entirely.
  - Other: any other error (db failures, etc).
*/
enum MigrateError {
    LegacyMessage(String),
    Other(String),
}

/*
  Migrate all whitelisted processes from the multi-tenant
  postgres + bytestore (EFS) setup into a local RocksDB
  based LocalStoreClient.

  Process bundles are read from postgres (small number of rows).
  Message bundles are read exclusively from the bytestore (RocksDB
  on EFS) to avoid the extreme slowness of reading binary/json
  columns out of postgres at scale.

  Processes are migrated concurrently using a semaphore to bound
  the number of in-flight tasks.
*/
pub async fn migrate_whitelist() -> Result<(), String> {
    let logger: Arc<dyn Log> = SuLog::init();

    let config = AoConfig::new(Some("su".to_string()))
        .map_err(|e| format!("Failed to read configuration: {:?}", e))?;

    logger.log("Initializing whitelist...".to_string());

    let process_whitelist = Arc::new(
        FileUrlWhitelist::new(
            &config.process_whitelist_url,
            &config.url,
            logger.clone(),
            false,
        )
        .await
        .map_err(|e| format!("Failed to init whitelist: {}", e))?,
    );

    logger.log("Initializing multi-tenant read-only store...".to_string());

    let store = Arc::new(StoreClient::multi_tenant_read_db(
        process_whitelist.clone(),
        config.clone(),
    ).map_err(|e| format!("Failed to init read store: {:?}", e))?);

    logger.log("Connecting bytestores...".to_string());
    store.connect_bytestores();

    logger.log("Initializing local store...".to_string());

    let local_store = Arc::new(LocalStoreClient::new(
        &config.su_file_db_dir,
        &config.su_index_db_dir,
    ).map_err(|e| format!("Failed to init local store: {:?}", e))?);

    let all_process_ids = store.process_id_list();

    logger.log(format!(
        "Total whitelisted processes to migrate: {}. Concurrency: {}",
        all_process_ids.len(),
        CONCURRENT_PROCESSES
    ));

    let total_processes = Arc::new(AtomicU64::new(0));
    let total_messages = Arc::new(AtomicU64::new(0));
    let semaphore = Arc::new(Semaphore::new(CONCURRENT_PROCESSES));

    let mut handles = Vec::with_capacity(all_process_ids.len());

    for pid in all_process_ids {
        let store = store.clone();
        let local_store = local_store.clone();
        let logger = logger.clone();
        let semaphore = semaphore.clone();
        let total_processes = total_processes.clone();
        let total_messages = total_messages.clone();

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();

            let pid_for_panic = pid.clone();
            let logger_for_panic = logger.clone();

            /*
              All the actual work is blocking (postgres queries,
              rocksdb reads/writes) so run it on the blocking pool.
            */
            let result = tokio::task::spawn_blocking(move || {
                /*
                  Migrate the process itself - read bundle from postgres
                  which is fine since there is only one row per process.
                */
                match migrate_process(&store, &local_store, &pid, &logger) {
                    Ok(_) => {
                        total_processes.fetch_add(1, Ordering::Relaxed);
                    }
                    Err(e) => {
                        logger.error(format!(
                            "Failed to migrate process '{}': {}", pid, e
                        ));
                        return;
                    }
                }

                /*
                  Migrate all messages for this process. Metadata comes
                  from postgres (lightweight columns only), bundle binaries
                  come from the bytestore.
                */
                match migrate_messages(&store, &local_store, &pid, &logger) {
                    Ok(count) => {
                        total_messages.fetch_add(count, Ordering::Relaxed);
                        logger.log(format!(
                            "Migrated {} messages for process '{}'", count, pid
                        ));
                    }
                    Err(MigrateError::LegacyMessage(e)) => {
                        /*
                          This process contains messages without assignments
                          (pre-March 2024 data). The local store cannot
                          represent these. Delete everything we wrote for
                          this process and log the failure.
                        */
                        logger.error(format!(
                            "Process '{}' contains legacy messages without assignments, \
                             removing from local store: {}", pid, e
                        ));
                        delete_process_data(&local_store, &pid);
                    }
                    Err(MigrateError::Other(e)) => {
                        logger.error(format!(
                            "Failed to migrate messages for process '{}': {}", pid, e
                        ));
                    }
                }
            }).await;

            if let Err(e) = result {
                logger_for_panic.error(format!(
                    "PANIC during migration of process '{}': {:?}", pid_for_panic, e
                ));
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        let _ = handle.await;
    }

    logger.log(format!(
        "Migration complete. {} processes, {} messages migrated.",
        total_processes.load(Ordering::Relaxed),
        total_messages.load(Ordering::Relaxed),
    ));

    Ok(())
}

fn migrate_process(
    store: &StoreClient,
    local_store: &LocalStoreClient,
    process_id: &str,
    logger: &Arc<dyn Log>,
) -> Result<(), String> {
    /*
      Check if the process already exists in the local store.
      If it does, skip re-migrating it.
    */
    if process_exists_locally(local_store, process_id) {
        logger.log(format!(
            "Process '{}' already exists in local store, skipping", process_id
        ));
        return Ok(());
    }

    let bundle = store.get_process_bundle(process_id)
        .map_err(|e| format!("{:?}", e))?;

    let process = Process::from_bytes(bundle.clone(), &None)
        .map_err(|e| format!("Failed to parse process bundle: {:?}", e))?;

    local_store.save_process(&process, &bundle)
        .map_err(|e| format!("{:?}", e))?;

    Ok(())
}

/*
  Check whether a process has already been saved to the local store
  by looking up its entry in the process column family.
*/
fn process_exists_locally(local_store: &LocalStoreClient, process_id: &str) -> bool {
    let cf = match local_store.index_db.cf_handle("process") {
        Some(cf) => cf,
        None => return false,
    };

    let prefix = format!("process:{}:", process_id);
    let mut iter = local_store.index_db.prefix_iterator_cf(cf, prefix.as_bytes());
    iter.next().is_some()
}

fn migrate_messages(
    store: &StoreClient,
    local_store: &LocalStoreClient,
    process_id: &str,
    logger: &Arc<dyn Log>,
) -> Result<u64, MigrateError> {
    let mut migrated: u64 = 0;

    /*
      Determine where to resume from by checking the latest
      message already in the local store and verifying its
      integrity across all column families and file_db.
    */
    let mut after_timestamp: Option<i64> = match find_resume_point(local_store, process_id, logger)
        .map_err(MigrateError::Other)?
    {
        ResumePoint::FromStart => None,
        ResumePoint::AfterTimestamp(ts) => {
            logger.log(format!(
                "Resuming process '{}' from after timestamp {}", process_id, ts
            ));
            Some(ts)
        }
    };

    loop {
        let rows = store.list_message_metadata(
            process_id,
            after_timestamp,
            BATCH_SIZE,
        ).map_err(|e| MigrateError::Other(format!("{:?}", e)))?;

        if rows.is_empty() {
            break;
        }

        for row in &rows {
            let binary = store.read_message_binary(
                &row.process_id,
                &row.message_id,
                &row.assignment_id,
                &row.timestamp.to_string(),
            ).map_err(|e| MigrateError::Other(format!("{:?}", e)))?;

            let bundle = match binary {
                Some(b) => b,
                None => {
                    /*
                      Fallback to postgres if the message was never written
                      to the bytestore. This is slow but necessary for
                      completeness.
                    */
                    match store.get_message_bundle_from_db(
                        &row.process_id,
                        &row.message_id,
                        &row.assignment_id,
                    ) {
                        Ok(b) => b,
                        Err(e) => {
                            logger.error(format!(
                                "No binary for msg '{}' asgn '{:?}' proc '{}' ts '{}' (bytestore miss, db fallback failed: {:?}), skipping",
                                row.message_id, row.assignment_id, row.process_id, row.timestamp, e
                            ));
                            continue;
                        }
                    }
                }
            };

            let message = match Message::from_bytes(bundle.clone(), &None) {
                Ok(m) => m,
                Err(e) => {
                    /*
                      If the message cannot be parsed it is likely a
                      legacy message without an assignment (pre-March 2024).
                      The local store cannot represent these so we signal
                      the caller to delete this process entirely.
                    */
                    return Err(MigrateError::LegacyMessage(format!(
                        "Failed to parse message '{}' (assignment '{:?}'): {:?}",
                        row.message_id, row.assignment_id, e
                    )));
                }
            };

            /*
              save_message is async in trait but the LocalStoreClient
              implementation is purely synchronous (RocksDB puts).
              We are already on a blocking thread so use Handle::block_on.
            */
            tokio::runtime::Handle::current().block_on(
                local_store.save_message(&message, &bundle, None)
            ).map_err(|e| MigrateError::Other(format!("{:?}", e)))?;

            migrated += 1;
        }

        /*
          Use the last row's timestamp as the cursor for the next batch.
        */
        after_timestamp = Some(rows.last().unwrap().timestamp);

        if (rows.len() as i64) < BATCH_SIZE {
            break;
        }
    }

    Ok(migrated)
}

/*
  Determine the resume point for a process by finding the latest
  message in the local store and verifying that all of its data
  is intact across all storage locations:
    1. message CF in index_db (composite key)
    2. message_ordering CF in index_db (ordering key)
    3. file_db (the actual bundle bytes keyed by assignment)

  If verification passes, we resume after that message's timestamp.
  If verification fails (partial write from a crash), we delete the
  corrupt entry and resume after the previous message's timestamp.
  If no messages exist, we start from the beginning.
*/
fn find_resume_point(
    local_store: &LocalStoreClient,
    process_id: &str,
    logger: &Arc<dyn Log>,
) -> Result<ResumePoint, String> {
    let cf = local_store.index_db.cf_handle("message_ordering")
        .ok_or_else(|| "Column family 'message_ordering' not found".to_string())?;

    let prefix = format!("message_ordering:{}:", process_id);
    let iter = local_store.index_db.prefix_iterator_cf(cf, prefix.as_bytes());

    /*
      Collect the last two entries from the ordering index.
      We need the second-to-last in case the last one is corrupt
      and needs to be removed.
    */
    let mut prev_entry: Option<(String, String)> = None;
    let mut latest_entry: Option<(String, String)> = None;

    for item in iter {
        let (key, value) = item.map_err(|e| format!("RocksDB iter error: {:?}", e))?;
        let key_str = String::from_utf8(key.to_vec())
            .map_err(|e| format!("Invalid UTF-8 key: {:?}", e))?;
        let assignment_id = String::from_utf8(value.to_vec())
            .map_err(|e| format!("Invalid UTF-8 value: {:?}", e))?;

        prev_entry = latest_entry.take();
        latest_entry = Some((key_str, assignment_id));
    }

    let (latest_key, latest_assignment_id) = match latest_entry {
        Some(entry) => entry,
        None => return Ok(ResumePoint::FromStart),
    };

    /*
      Verify the latest message has all its data intact.
    */
    if verify_message_integrity(local_store, &latest_key, &latest_assignment_id) {
        let timestamp = extract_timestamp_from_ordering_key(&latest_key)?;
        return Ok(ResumePoint::AfterTimestamp(timestamp));
    }

    /*
      Verification failed - the latest message is corrupt (partial write).
      Remove it and fall back to the previous message's timestamp.
    */
    logger.log(format!(
        "Latest message for '{}' failed integrity check (assignment '{}'), removing corrupt entry",
        process_id, latest_assignment_id
    ));

    delete_corrupt_message(local_store, &latest_key, &latest_assignment_id, process_id);

    match prev_entry {
        Some((prev_key, _)) => {
            let timestamp = extract_timestamp_from_ordering_key(&prev_key)?;
            Ok(ResumePoint::AfterTimestamp(timestamp))
        }
        None => Ok(ResumePoint::FromStart),
    }
}

/*
  Verify that a message has all of its data written across
  all three storage locations. Returns true only if all data
  is present and consistent.
*/
fn verify_message_integrity(
    local_store: &LocalStoreClient,
    ordering_key: &str,
    assignment_id: &str,
) -> bool {
    /*
      1. Check file_db has the bundle bytes
    */
    let file_key = format!("message_assignment:{}", assignment_id);
    match local_store.file_db.get(file_key.as_bytes()) {
        Ok(Some(bundle_bytes)) => {
            /*
              Verify the bundle is parseable
            */
            if Message::from_bytes(bundle_bytes, &None).is_err() {
                return false;
            }
        }
        _ => return false,
    }

    /*
      2. Check the message composite key exists in the message CF.
         We need the message_id to construct it - parse from the bundle.
    */
    let bundle_bytes = local_store.file_db.get(file_key.as_bytes())
        .ok().flatten().unwrap();
    let message = match Message::from_bytes(bundle_bytes, &None) {
        Ok(m) => m,
        Err(_) => return false,
    };

    let message_id = match message.message_id() {
        Ok(id) => id,
        Err(_) => return false,
    };

    let cf = match local_store.index_db.cf_handle("message") {
        Some(cf) => cf,
        None => return false,
    };

    let composite_key = format!("message:{}:{}", message_id, assignment_id);
    match local_store.index_db.get_cf(cf, composite_key.as_bytes()) {
        Ok(Some(_)) => {}
        _ => return false,
    }

    /*
      3. Check the ordering key itself exists (it should since we
         iterated over it, but confirm the value is correct)
    */
    let cf = match local_store.index_db.cf_handle("message_ordering") {
        Some(cf) => cf,
        None => return false,
    };

    match local_store.index_db.get_cf(cf, ordering_key.as_bytes()) {
        Ok(Some(val)) => {
            let stored_id = String::from_utf8(val.to_vec()).unwrap_or_default();
            if stored_id != assignment_id {
                return false;
            }
        }
        _ => return false,
    }

    true
}

/*
  Extract the timestamp from a message_ordering key.
  Key format: message_ordering:{process_id}:{epoch}:{nonce}:{timestamp}:{assignment_id}
*/
fn extract_timestamp_from_ordering_key(key: &str) -> Result<i64, String> {
    let parts: Vec<&str> = key.split(':').collect();
    if parts.len() < 5 {
        return Err(format!("Invalid ordering key format: '{}'", key));
    }
    parts[4].trim_start_matches('0').parse::<i64>()
        .or_else(|_| {
            /*
              Handle the case where the timestamp is all zeros
            */
            if parts[4].chars().all(|c| c == '0') {
                Ok(0)
            } else {
                Err(format!("Failed to parse timestamp from key: '{}'", key))
            }
        })
}

/*
  Remove a corrupt message entry from all storage locations.
  Best-effort - we log but don't fail if some deletes don't work
  since the data may not have been written to all locations.
*/
fn delete_corrupt_message(
    local_store: &LocalStoreClient,
    ordering_key: &str,
    assignment_id: &str,
    _process_id: &str,
) {
    /*
      Delete from file_db
    */
    let file_key = format!("message_assignment:{}", assignment_id);
    let _ = local_store.file_db.delete(file_key.as_bytes());

    /*
      Delete from message_ordering CF
    */
    if let Some(cf) = local_store.index_db.cf_handle("message_ordering") {
        let _ = local_store.index_db.delete_cf(cf, ordering_key.as_bytes());
    }

    /*
      Delete from message CF - we need the message_id.
      Try to get it from the bundle if it still exists, otherwise
      do a prefix scan to find it.
    */
    if let Some(cf) = local_store.index_db.cf_handle("message") {
        /*
          Try to find any composite key ending with this assignment_id
          by scanning the message CF for this process. Since we don't
          know the message_id, we scan with a broad prefix.
        */
        let prefix = format!("message:");
        let iter = local_store.index_db.prefix_iterator_cf(cf, prefix.as_bytes());
        for item in iter {
            if let Ok((key, val)) = item {
                let val_str = String::from_utf8(val.to_vec()).unwrap_or_default();
                if val_str == assignment_id {
                    let _ = local_store.index_db.delete_cf(cf, &key);
                    break;
                }
            }
        }
    }
}

/*
  Delete all data for a process from the local store.
  This removes:
    - The process entry from the process CF
    - The process ordering entry from process_ordering CF
    - The process bundle from file_db
    - All message ordering entries for this process
    - All message composite entries for this process
    - All message bundles from file_db

  Best-effort: we continue even if individual deletes fail.
*/
fn delete_process_data(local_store: &LocalStoreClient, process_id: &str) {
    /*
      1. Delete all message_ordering entries for this process
         and collect assignment_ids so we can delete file_db entries.
    */
    let mut assignment_ids: Vec<String> = Vec::new();

    if let Some(cf) = local_store.index_db.cf_handle("message_ordering") {
        let prefix = format!("message_ordering:{}:", process_id);
        let iter = local_store.index_db.prefix_iterator_cf(cf, prefix.as_bytes());
        for item in iter {
            if let Ok((key, val)) = item {
                let _ = local_store.index_db.delete_cf(cf, &key);
                if let Ok(aid) = String::from_utf8(val.to_vec()) {
                    assignment_ids.push(aid);
                }
            }
        }
    }

    /*
      2. Delete message bundles from file_db and message CF entries
    */
    for aid in &assignment_ids {
        let file_key = format!("message_assignment:{}", aid);
        let _ = local_store.file_db.delete(file_key.as_bytes());
    }

    if let Some(cf) = local_store.index_db.cf_handle("message") {
        for aid in &assignment_ids {
            /*
              We don't know the message_id for the composite key,
              so scan for entries whose value matches this assignment_id.
            */
            let prefix = format!("message:");
            let iter = local_store.index_db.prefix_iterator_cf(cf, prefix.as_bytes());
            for item in iter {
                if let Ok((key, val)) = item {
                    let val_str = String::from_utf8(val.to_vec()).unwrap_or_default();
                    if val_str == *aid {
                        let _ = local_store.index_db.delete_cf(cf, &key);
                        break;
                    }
                }
            }
        }
    }

    /*
      3. Delete the process itself from the process CF
    */
    if let Some(cf) = local_store.index_db.cf_handle("process") {
        let prefix = format!("process:{}:", process_id);
        let iter = local_store.index_db.prefix_iterator_cf(cf, prefix.as_bytes());
        for item in iter {
            if let Ok((key, _)) = item {
                let _ = local_store.index_db.delete_cf(cf, &key);
            }
        }
    }

    /*
      4. Delete process ordering entries
    */
    if let Some(cf) = local_store.index_db.cf_handle("process_ordering") {
        let prefix = format!("process_ordering:{}:", process_id);
        let iter = local_store.index_db.prefix_iterator_cf(cf, prefix.as_bytes());
        for item in iter {
            if let Ok((key, _)) = item {
                let _ = local_store.index_db.delete_cf(cf, &key);
            }
        }
    }

    /*
      5. Delete process bundle from file_db.
         Could be stored under assignment_id or process_id (legacy).
    */
    let proc_key = format!("process_assignment:{}", process_id);
    let _ = local_store.file_db.delete(proc_key.as_bytes());
}
