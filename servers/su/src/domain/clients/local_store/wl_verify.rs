use std::sync::Arc;
use std::sync::atomic::{AtomicU64, AtomicBool, Ordering};
use std::collections::HashSet;

use tokio::sync::Semaphore;

use super::super::super::SuLog;
use super::super::super::config::AoConfig;
use super::super::super::core::dal::{DataStore, Log};
use super::super::store::StoreClient;
use super::super::whitelist::FileUrlWhitelist;
use super::store::LocalStoreClient;

const PAGE_SIZE: i32 = 100;

/*
  Number of processes to verify concurrently.
*/
fn concurrent_processes() -> usize {
    std::env::var("VERIFY_CONCURRENCY")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(60)
}

/*
  Parse the VERIFY_EXCLUDE_PROCESSES env var as a comma-separated
  list of process IDs to skip during verification.
*/
fn excluded_processes() -> HashSet<String> {
    std::env::var("VERIFY_EXCLUDE_PROCESSES")
        .unwrap_or_default()
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

enum VerifyResult {
    Match { messages_verified: u64 },
    Mismatch(String),
    Error(String),
}

/*
  Verify all whitelisted processes by comparing the JSON-serialized
  Process and Message objects returned by get_process and get_messages
  on both the multi-tenant store and the local store.

  Every Process and every Message is serialized to JSON and compared
  byte-for-byte. The only acceptable discrepancy is trailing messages
  in the multi-tenant store not yet in the local store.

  Use VERIFY_EXCLUDE_PROCESSES env var (comma-separated) to skip
  specific processes.
*/
pub async fn verify_whitelist() -> Result<(), String> {
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

    logger.log("Initializing local store (read-only)...".to_string());

    let local_store = Arc::new(LocalStoreClient::new_read_only(
        &config.su_file_db_dir,
        &config.su_index_db_dir,
    ).map_err(|e| format!("Failed to init local store: {:?}", e))?);

    let excluded = excluded_processes();
    let all_process_ids: Vec<String> = store.process_id_list()
        .into_iter()
        .filter(|pid| !excluded.contains(pid))
        .collect();

    let concurrency = concurrent_processes();

    logger.log(format!(
        "Total processes to verify: {} (excluded: {}). Concurrency: {}",
        all_process_ids.len(),
        excluded.len(),
        concurrency
    ));

    let total_processes = Arc::new(AtomicU64::new(0));
    let total_messages = Arc::new(AtomicU64::new(0));
    let total_mismatches = Arc::new(AtomicU64::new(0));
    let total_errors = Arc::new(AtomicU64::new(0));
    let completed = Arc::new(AtomicU64::new(0));
    let total_count = all_process_ids.len() as u64;
    let semaphore = Arc::new(Semaphore::new(concurrency));

    let mut handles = Vec::with_capacity(all_process_ids.len());

    for pid in all_process_ids {
        let store = store.clone();
        let local_store = local_store.clone();
        let logger = logger.clone();
        let semaphore = semaphore.clone();
        let total_processes = total_processes.clone();
        let total_messages = total_messages.clone();
        let total_mismatches = total_mismatches.clone();
        let total_errors = total_errors.clone();
        let completed = completed.clone();

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();

            let pid_for_log = pid.clone();
            let logger_for_log = logger.clone();

            let result = verify_process_async(&store, &local_store, &pid, &logger).await;

            match result {
                VerifyResult::Match { messages_verified } => {
                    total_processes.fetch_add(1, Ordering::Relaxed);
                    total_messages.fetch_add(messages_verified, Ordering::Relaxed);
                }
                VerifyResult::Mismatch(desc) => {
                    total_mismatches.fetch_add(1, Ordering::Relaxed);
                    logger_for_log.error(format!(
                        "MISMATCH process '{}': {}", pid_for_log, desc
                    ));
                }
                VerifyResult::Error(e) => {
                    total_errors.fetch_add(1, Ordering::Relaxed);
                    logger_for_log.error(format!(
                        "ERROR verifying process '{}': {}", pid_for_log, e
                    ));
                }
            }

            let done = completed.fetch_add(1, Ordering::Relaxed) + 1;
            if done % 100 == 0 || done == total_count {
                logger_for_log.log(format!(
                    "Progress: {}/{} processes done | {} messages verified | {} mismatches | {} errors",
                    done,
                    total_count,
                    total_messages.load(Ordering::Relaxed),
                    total_mismatches.load(Ordering::Relaxed),
                    total_errors.load(Ordering::Relaxed),
                ));
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        let _ = handle.await;
    }

    let procs = total_processes.load(Ordering::Relaxed);
    let msgs = total_messages.load(Ordering::Relaxed);
    let mismatches = total_mismatches.load(Ordering::Relaxed);
    let errors = total_errors.load(Ordering::Relaxed);

    logger.log(format!(
        "Verification complete. {} processes, {} messages verified. {} mismatches, {} errors.",
        procs, msgs, mismatches, errors
    ));

    if mismatches > 0 || errors > 0 {
        Err(format!(
            "Verification failed: {} mismatches, {} errors", mismatches, errors
        ))
    } else {
        Ok(())
    }
}

/*
  Verify a single process by JSON-encoding Process and Message
  objects from both stores and comparing the bytes.
*/
async fn verify_process_async(
    store: &Arc<StoreClient>,
    local_store: &Arc<LocalStoreClient>,
    process_id: &str,
    logger: &Arc<dyn Log>,
) -> VerifyResult {
    /*
      Compare Process JSON
    */
    let mt_process = match store.get_process(process_id).await {
        Ok(p) => p,
        Err(e) => return VerifyResult::Error(format!(
            "Failed to get_process from multi-tenant: {:?}", e
        )),
    };

    let local_process = match local_store.get_process(process_id).await {
        Ok(p) => p,
        Err(e) => return VerifyResult::Error(format!(
            "Failed to get_process from local store: {:?}", e
        )),
    };

    let mt_process_json = match serde_json::to_vec(&mt_process) {
        Ok(j) => j,
        Err(e) => return VerifyResult::Error(format!(
            "Failed to serialize mt process: {}", e
        )),
    };

    let local_process_json = match serde_json::to_vec(&local_process) {
        Ok(j) => j,
        Err(e) => return VerifyResult::Error(format!(
            "Failed to serialize local process: {}", e
        )),
    };

    if mt_process_json != local_process_json {
        return VerifyResult::Mismatch(format!(
            "Process JSON differs ({} vs {} bytes)",
            mt_process_json.len(), local_process_json.len()
        ));
    }

    /*
      Page through messages comparing JSON of each edge
    */
    let mut messages_verified: u64 = 0;
    let mut from_cursor: Option<String> = None;

    loop {
        let mt_page = match store.get_messages(
            &mt_process,
            &from_cursor,
            &None,
            &Some(PAGE_SIZE),
            &None,
            &None,
            &None,
        ).await {
            Ok(p) => p,
            Err(e) => return VerifyResult::Error(format!(
                "Failed to get_messages from multi-tenant (from={:?}): {:?}",
                from_cursor, e
            )),
        };

        let local_page = match local_store.get_messages(
            &local_process,
            &from_cursor,
            &None,
            &Some(PAGE_SIZE),
            &None,
            &None,
            &None,
        ).await {
            Ok(p) => p,
            Err(e) => return VerifyResult::Error(format!(
                "Failed to get_messages from local store (from={:?}): {:?}",
                from_cursor, e
            )),
        };

        let mt_edges = &mt_page.edges;
        let local_edges = &local_page.edges;

        let compare_len = std::cmp::min(mt_edges.len(), local_edges.len());

        for i in 0..compare_len {
            let mt_json = match serde_json::to_vec(&mt_edges[i]) {
                Ok(j) => j,
                Err(e) => return VerifyResult::Error(format!(
                    "Failed to serialize mt edge {}: {}", messages_verified + i as u64, e
                )),
            };

            let local_json = match serde_json::to_vec(&local_edges[i]) {
                Ok(j) => j,
                Err(e) => return VerifyResult::Error(format!(
                    "Failed to serialize local edge {}: {}", messages_verified + i as u64, e
                )),
            };

            if mt_json != local_json {
                return VerifyResult::Mismatch(format!(
                    "Message JSON differs at position {} (cursor mt='{}' local='{}'): {} vs {} bytes",
                    messages_verified + i as u64,
                    mt_edges[i].cursor,
                    local_edges[i].cursor,
                    mt_json.len(),
                    local_json.len()
                ));
            }
        }

        messages_verified += compare_len as u64;

        /*
          If local has fewer messages, the rest are acceptable
          trailing writes on the live multi-tenant store.
        */
        if local_edges.len() < mt_edges.len() {
            logger.log(format!(
                "Process '{}': local store has fewer messages (acceptable tail), \
                 {} verified before divergence",
                process_id, messages_verified
            ));
            break;
        }

        if mt_edges.is_empty() || mt_edges.len() < PAGE_SIZE as usize {
            break;
        }

        from_cursor = Some(mt_edges.last().unwrap().cursor.clone());
    }

    VerifyResult::Match { messages_verified }
}
