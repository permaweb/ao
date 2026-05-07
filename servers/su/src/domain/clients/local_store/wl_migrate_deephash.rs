use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use tokio::sync::Semaphore;

use super::super::super::SuLog;
use super::super::super::config::AoConfig;
use super::super::super::core::dal::Log;
use super::super::store::StoreClient;
use super::super::whitelist::FileUrlWhitelist;
use super::store::LocalStoreClient;

/*
  Number of processes to migrate concurrently. Each process
  gets its own tokio task but we limit how many run at once
  to avoid overwhelming resources.
*/
fn concurrent_processes() -> usize {
    std::env::var("MIGRATE_CONCURRENCY")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(60)
}

/*
  Migrate all deep hashes and deep hash versions from the
  multi-tenant bytestores (RocksDB on EFS) into the local
  store's RocksDB column families.

  For each whitelisted process:
    1. Read the deep hash version from the bytestore
    2. Read all deep hash entries for the process from the bytestore
    3. Write the deep hash version into the local store's
       "deep_hash_version" column family
    4. Write each deep hash entry into the local store's
       "deep_hash" column family

  Processes are migrated concurrently using a semaphore to bound
  the number of in-flight tasks.
*/
pub async fn migrate_deep_hashes() -> Result<(), String> {
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

    let concurrency = concurrent_processes();

    logger.log(format!(
        "Total whitelisted processes to migrate deep hashes for: {}. Concurrency: {}",
        all_process_ids.len(),
        concurrency
    ));

    let total_processes = Arc::new(AtomicU64::new(0));
    let total_hashes = Arc::new(AtomicU64::new(0));
    let total_versions = Arc::new(AtomicU64::new(0));
    let semaphore = Arc::new(Semaphore::new(concurrency));

    let mut handles = Vec::with_capacity(all_process_ids.len());

    for pid in all_process_ids {
        let store = store.clone();
        let local_store = local_store.clone();
        let logger = logger.clone();
        let semaphore = semaphore.clone();
        let total_processes = total_processes.clone();
        let total_hashes = total_hashes.clone();
        let total_versions = total_versions.clone();

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();

            let pid_for_panic = pid.clone();
            let logger_for_panic = logger.clone();

            let result = tokio::task::spawn_blocking(move || {
                migrate_process_deep_hashes(
                    &store,
                    &local_store,
                    &pid,
                    &logger,
                    &total_hashes,
                    &total_versions,
                );
                total_processes.fetch_add(1, Ordering::Relaxed);
            }).await;

            if let Err(e) = result {
                logger_for_panic.error(format!(
                    "PANIC during deep hash migration of process '{}': {:?}",
                    pid_for_panic, e
                ));
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        let _ = handle.await;
    }

    logger.log(format!(
        "Deep hash migration complete. {} processes, {} deep hashes, {} versions migrated.",
        total_processes.load(Ordering::Relaxed),
        total_hashes.load(Ordering::Relaxed),
        total_versions.load(Ordering::Relaxed),
    ));

    Ok(())
}

fn migrate_process_deep_hashes(
    store: &StoreClient,
    local_store: &LocalStoreClient,
    process_id: &str,
    logger: &Arc<dyn Log>,
    total_hashes: &AtomicU64,
    total_versions: &AtomicU64,
) {
    /*
      1. Migrate the deep hash version if it exists
    */
    if let Some(version) = store.get_deep_hash_version_for_process(process_id) {
        let cf = match local_store.index_db.cf_handle("deep_hash_version") {
            Some(cf) => cf,
            None => {
                logger.error(format!(
                    "Column family 'deep_hash_version' not found for process '{}'",
                    process_id
                ));
                return;
            }
        };

        let key = format!("deep_hash_version:{}", process_id);
        if let Err(e) = local_store.index_db.put_cf(cf, key.as_bytes(), version.as_bytes()) {
            logger.error(format!(
                "Failed to write deep hash version for process '{}': {:?}",
                process_id, e
            ));
            return;
        }

        total_versions.fetch_add(1, Ordering::Relaxed);
    }

    /*
      2. Migrate all deep hash entries for the process
    */
    let deep_hashes = match store.get_deep_hashes_for_process(process_id) {
        Ok(hashes) => hashes,
        Err(e) => {
            logger.error(format!(
                "Failed to read deep hashes for process '{}': {}",
                process_id, e
            ));
            return;
        }
    };

    if deep_hashes.is_empty() {
        return;
    }

    let cf = match local_store.index_db.cf_handle("deep_hash") {
        Some(cf) => cf,
        None => {
            logger.error(format!(
                "Column family 'deep_hash' not found for process '{}'",
                process_id
            ));
            return;
        }
    };

    let mut count: u64 = 0;

    for deep_hash in &deep_hashes {
        let key = format!("deep_hash:{}:{}", process_id, deep_hash);
        if let Err(e) = local_store.index_db.put_cf(cf, key.as_bytes(), process_id.as_bytes()) {
            logger.error(format!(
                "Failed to write deep hash '{}' for process '{}': {:?}",
                deep_hash, process_id, e
            ));
            continue;
        }
        count += 1;
    }

    total_hashes.fetch_add(count, Ordering::Relaxed);

    logger.log(format!(
        "Migrated {} deep hashes for process '{}'", count, process_id
    ));
}
