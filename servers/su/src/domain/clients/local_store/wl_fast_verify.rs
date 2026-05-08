use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use tokio::sync::Semaphore;

use super::super::super::SuLog;
use super::super::super::config::AoConfig;
use super::super::super::core::dal::{DataStore, Log};
use super::super::store::StoreClient;
use super::super::whitelist::FileUrlWhitelist;
use super::store::LocalStoreClient;

const PAGE_SIZE: i32 = 100;

/*
  Number of segments to divide each process into for parallel
  verification. Each segment gets its own task.
*/
fn segments_per_process() -> usize {
    std::env::var("FAST_VERIFY_SEGMENTS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(50)
}

/*
  Maximum number of concurrent segment verification tasks across
  all processes.
*/
fn max_concurrency() -> usize {
    std::env::var("FAST_VERIFY_CONCURRENCY")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(300)
}

/*
  Parse the FAST_VERIFICATIONS env var as a comma-separated list
  of process IDs to verify.
*/
fn target_processes() -> Vec<String> {
    std::env::var("FAST_VERIFICATIONS")
        .unwrap_or_default()
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/*
  Fast parallel verification of specific processes.

  Reads FAST_VERIFICATIONS env var for a CSV of process IDs.
  For each process:
    1. Finds the first and last message timestamps
    2. Divides the timestamp range into FAST_VERIFY_SEGMENTS segments
    3. Spawns a task for each segment to verify messages in that range
    4. Each segment pages through messages comparing JSON from both stores

  This enables verifying very large processes (millions of messages)
  much faster than sequential paging by spreading the work across
  many parallel tasks.
*/
pub async fn fast_verify() -> Result<(), String> {
    let logger: Arc<dyn Log> = SuLog::init();

    let process_ids = target_processes();
    if process_ids.is_empty() {
        return Err("FAST_VERIFICATIONS env var is empty or not set".to_string());
    }

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

    let segments = segments_per_process();
    let concurrency = max_concurrency();

    logger.log(format!(
        "Fast verify: {} processes, {} segments per process, {} max concurrency",
        process_ids.len(), segments, concurrency
    ));

    let semaphore = Arc::new(Semaphore::new(concurrency));
    let total_messages = Arc::new(AtomicU64::new(0));
    let total_errors = Arc::new(AtomicU64::new(0));
    let total_segments_done = Arc::new(AtomicU64::new(0));

    let mut all_handles = Vec::new();

    for pid in &process_ids {
        logger.log(format!("Building segment ranges for process '{}'...", pid));

        /*
          Find the timestamp range for this process by getting the
          first message and the last message timestamp from the
          multi-tenant store.
        */
        let first_ts = match get_first_timestamp(&store, pid) {
            Ok(Some(ts)) => ts,
            Ok(None) => {
                logger.log(format!("Process '{}': no messages found, skipping", pid));
                continue;
            }
            Err(e) => {
                logger.error(format!("Process '{}': failed to get first timestamp: {}", pid, e));
                continue;
            }
        };

        let last_ts = match get_last_timestamp(&store, &local_store, pid).await {
            Ok(Some(ts)) => ts,
            Ok(None) => {
                logger.log(format!("Process '{}': no latest message, skipping", pid));
                continue;
            }
            Err(e) => {
                logger.error(format!("Process '{}': failed to get last timestamp: {}", pid, e));
                continue;
            }
        };

        if last_ts <= first_ts {
            logger.log(format!("Process '{}': only one message, skipping", pid));
            continue;
        }

        /*
          Build segment ranges by dividing the timestamp space evenly.
          Each segment covers [from_ts, to_ts) where from is exclusive
          (matching the SU API semantics).
        */
        let range = last_ts - first_ts;
        let segment_size = range / segments as i64;

        let mut segment_ranges: Vec<(Option<i64>, Option<i64>)> = Vec::with_capacity(segments);

        for s in 0..segments {
            let from = if s == 0 {
                None // First segment starts from the very beginning
            } else {
                Some(first_ts + (segment_size * s as i64))
            };

            let to = if s == segments - 1 {
                None // Last segment goes to the end
            } else {
                Some(first_ts + (segment_size * (s + 1) as i64))
            };

            segment_ranges.push((from, to));
        }

        logger.log(format!(
            "Process '{}': ts range {}-{}, {} segments of ~{} ms each",
            pid, first_ts, last_ts, segment_ranges.len(), segment_size
        ));

        /*
          Spawn a verification task for each segment.
        */
        let mt_process = match store.get_process(pid).await {
            Ok(p) => Arc::new(p),
            Err(e) => {
                logger.error(format!("Process '{}': failed to get process: {:?}", pid, e));
                continue;
            }
        };

        let local_process = match local_store.get_process(pid).await {
            Ok(p) => Arc::new(p),
            Err(e) => {
                logger.error(format!("Process '{}': failed to get local process: {:?}", pid, e));
                continue;
            }
        };

        for (seg_idx, (from_ts, to_ts)) in segment_ranges.into_iter().enumerate() {
            let store = store.clone();
            let local_store = local_store.clone();
            let logger = logger.clone();
            let semaphore = semaphore.clone();
            let total_messages = total_messages.clone();
            let total_errors = total_errors.clone();
            let total_segments_done = total_segments_done.clone();
            let mt_process = mt_process.clone();
            let local_process = local_process.clone();
            let pid = pid.clone();

            let handle = tokio::spawn(async move {
                let _permit = semaphore.acquire().await.unwrap();

                let result = verify_segment(
                    &store,
                    &local_store,
                    &mt_process,
                    &local_process,
                    &pid,
                    from_ts,
                    to_ts,
                    &logger,
                ).await;

                match result {
                    Ok((count, mismatches)) => {
                        total_messages.fetch_add(count, Ordering::Relaxed);
                        if mismatches > 0 {
                            total_errors.fetch_add(1, Ordering::Relaxed);
                            logger.log(format!(
                                "VERIFIED WITH MISMATCHES Process '{}' segment {}: {} messages, {} mismatches",
                                pid, seg_idx, count, mismatches
                            ));
                        } else {
                            logger.log(format!(
                                "VERIFIED Process '{}' segment {}: OK ({} messages)",
                                pid, seg_idx, count
                            ));
                        }
                    }
                    Err(e) => {
                        total_errors.fetch_add(1, Ordering::Relaxed);
                        logger.error(format!(
                            "FAILED Process '{}' segment {}: {}", pid, seg_idx, e
                        ));
                    }
                }

                let done = total_segments_done.fetch_add(1, Ordering::Relaxed) + 1;
                if done % 50 == 0 {
                    logger.log(format!(
                        "Progress: {} segments done | {} messages verified | {} errors",
                        done,
                        total_messages.load(Ordering::Relaxed),
                        total_errors.load(Ordering::Relaxed),
                    ));
                }
            });

            all_handles.push(handle);
        }
    }

    let total_segments = all_handles.len();
    logger.log(format!("Launched {} total segment tasks, waiting...", total_segments));

    for handle in all_handles {
        let _ = handle.await;
    }

    let msgs = total_messages.load(Ordering::Relaxed);
    let errors = total_errors.load(Ordering::Relaxed);

    logger.log(format!(
        "Fast verify complete. {} segments, {} messages verified, {} errors.",
        total_segments, msgs, errors
    ));

    if errors > 0 {
        Err(format!("Fast verify had {} errors", errors))
    } else {
        Ok(())
    }
}

/*
  Get the first message timestamp for a process from the multi-tenant
  store by querying the first row ordered by timestamp.
*/
fn get_first_timestamp(store: &StoreClient, process_id: &str) -> Result<Option<i64>, String> {
    let rows = store.list_message_metadata(process_id, None, 1)
        .map_err(|e| format!("{:?}", e))?;
    Ok(rows.first().map(|r| r.timestamp))
}

/*
  Get the last message timestamp for a process. Use the local store's
  latest message since that's the boundary we can verify up to.
*/
async fn get_last_timestamp(
    _store: &StoreClient,
    local_store: &LocalStoreClient,
    process_id: &str,
) -> Result<Option<i64>, String> {
    match local_store.get_latest_message(process_id).await {
        Ok(Some(msg)) => {
            msg.timestamp()
                .map(|ts| Some(ts))
                .map_err(|e| format!("{:?}", e))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(format!("{:?}", e)),
    }
}

/*
  Verify a single segment of messages for a process.
  Pages through both stores from `from_ts` to `to_ts` comparing
  each message JSON byte-for-byte.

  Returns the number of messages verified in this segment.
*/
async fn verify_segment(
    store: &Arc<StoreClient>,
    local_store: &Arc<LocalStoreClient>,
    mt_process: &Arc<super::super::super::core::dal::Process>,
    local_process: &Arc<super::super::super::core::dal::Process>,
    process_id: &str,
    from_ts: Option<i64>,
    to_ts: Option<i64>,
    logger: &Arc<dyn Log>,
) -> Result<(u64, u64), String> {
    let mut messages_verified: u64 = 0;
    let mut mismatches: u64 = 0;
    let mut from_cursor: Option<String> = from_ts.map(|ts| ts.to_string());
    let to_cursor: Option<String> = to_ts.map(|ts| ts.to_string());

    loop {
        let mt_page = store.get_messages(
            mt_process,
            &from_cursor,
            &to_cursor,
            &Some(PAGE_SIZE),
            &None,
            &None,
            &None,
        ).await.map_err(|e| format!(
            "Failed to get_messages from multi-tenant (from={:?} to={:?}): {:?}",
            from_cursor, to_cursor, e
        ))?;

        let local_page = local_store.get_messages(
            local_process,
            &from_cursor,
            &to_cursor,
            &Some(PAGE_SIZE),
            &None,
            &None,
            &None,
        ).await.map_err(|e| format!(
            "Failed to get_messages from local store (from={:?} to={:?}): {:?}",
            from_cursor, to_cursor, e
        ))?;

        let mt_edges = &mt_page.edges;
        let local_edges = &local_page.edges;

        let compare_len = std::cmp::min(mt_edges.len(), local_edges.len());

        for i in 0..compare_len {
            let mt_json = serde_json::to_vec(&mt_edges[i])
                .map_err(|e| format!("Failed to serialize mt edge: {}", e))?;

            let local_json = serde_json::to_vec(&local_edges[i])
                .map_err(|e| format!("Failed to serialize local edge: {}", e))?;

            if mt_json != local_json {
                mismatches += 1;
                logger.error(format!(
                    "Process '{}': Message JSON differs at position {} (cursor mt='{}' local='{}'): {} vs {} bytes",
                    process_id,
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
          If local has fewer messages in this segment, note it and stop.
        */
        if local_edges.len() < mt_edges.len() {
            logger.log(format!(
                "Process '{}': local has fewer messages in segment (from={:?} to={:?}), {} verified before divergence",
                process_id, from_ts, to_ts, messages_verified
            ));
            break;
        }

        if mt_edges.is_empty() || mt_edges.len() < PAGE_SIZE as usize {
            break;
        }

        from_cursor = Some(mt_edges.last().unwrap().cursor.clone());
    }

    Ok((messages_verified, mismatches))
}
