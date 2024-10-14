use std::env;
use std::io;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use futures::future::join_all;
use tokio::task::JoinHandle;
use tokio::time::interval;

use super::super::super::store::StoreClient;
use crate::domain::config::AoConfig;
use crate::domain::core::dal::{DataItem, Message, Process};

/*
  This is a migration which moves all data
  out of the old data store and into the
  local store.
*/

const LAST_MESSAGE_ROW_KEY: &str = "last_message_row_id";
const LAST_PROCESS_ROW_KEY: &str = "last_process_row_id";

pub async fn migrate_to_local() -> io::Result<()> {
    if env::args().any(|arg| arg == "clear") {
        let config = AoConfig::new(None).expect("Failed to read configuration");
        let local_data_store = Arc::new(
            super::store::LocalStoreClient::new(&config.su_file_db_dir, &config.su_index_db_dir)
                .expect("Failed to create LocalStoreClient"),
        );

        local_data_store
            .file_db
            .delete(LAST_MESSAGE_ROW_KEY)
            .unwrap();
        local_data_store
            .file_db
            .delete(LAST_PROCESS_ROW_KEY)
            .unwrap();

        println!("Cleared saved keys for last processed rows.");
        return Ok(());
    }

    let start = Instant::now();
    let data_store =
        Arc::new(StoreClient::new_single_connection().expect("Failed to create StoreClient"));

    data_store
        .bytestore
        .try_read_instance_connect()
        .expect("Failed to connect to bytestore");

    let config = AoConfig::new(None).expect("Failed to read configuration");

    let local_data_store = Arc::new(
        super::store::LocalStoreClient::new(&config.su_file_db_dir, &config.su_index_db_dir)
            .expect("Failed to create LocalStoreClient"),
    );

    let batch_size = 100;
    let total_count = data_store
        .get_message_count()
        .expect("Failed to get message count");

    data_store
        .logger
        .log(format!("Total messages to process: {}", total_count));

    let processed_count = Arc::new(AtomicUsize::new(0));
    let processed_count_clone = Arc::clone(&processed_count);
    let data_store_c = Arc::clone(&data_store);

    let last_message_row_offset = local_data_store
        .file_db
        .get(LAST_MESSAGE_ROW_KEY)
        .unwrap()
        .and_then(|bytes| String::from_utf8(bytes.to_vec()).ok())
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(0) as i64;

    tokio::spawn(async move {
        let mut interval = interval(Duration::from_secs(10));
        while processed_count_clone.load(Ordering::Relaxed) < total_count as usize {
            interval.tick().await;
            data_store_c.logger.log(format!(
                "Messages processed update: {}",
                processed_count_clone.load(Ordering::Relaxed)
            ));
        }
    });

    for batch_start in (last_message_row_offset..total_count).step_by(batch_size) {
        if let Ok(messages) = data_store
            .get_all_messages_using_bytestore(batch_start, Some(batch_start + batch_size as i64))
            .await
        {
            let save_handles: Vec<JoinHandle<()>> = messages
                .into_iter()
                .map(|message| {
                    let (msg_id, assignment_id, process_id, timestamp, epoch, nonce, _, bundle) =
                        message;
                    let processed_count = Arc::clone(&processed_count);
                    let local_data_store_clone = Arc::clone(&local_data_store);

                    let (assignment, composite_key, order_key, assignment_key) = match assignment_id
                    {
                        Some(a_id) => (
                            a_id.clone(),
                            format!("message:{}:{}", msg_id, a_id),
                            format!(
                                "message_ordering:{}:{:010}:{:010}:{:015}:{}",
                                process_id, epoch, nonce, timestamp, a_id
                            ),
                            format!("message_assignment:{}", a_id),
                        ),
                        None => {
                            let parsed_message = Message::from_bytes(bundle.clone()).unwrap();
                            (
                                parsed_message.assignment.id.clone(),
                                format!("message:{}:{}", msg_id, parsed_message.assignment.id),
                                format!(
                                    "message_ordering:{}:{:010}:{:010}:{:015}:{}",
                                    process_id,
                                    epoch,
                                    nonce,
                                    timestamp,
                                    parsed_message.assignment.id
                                ),
                                format!("message_assignment:{}", parsed_message.assignment.id),
                            )
                        }
                    };

                    tokio::task::spawn_blocking(move || {
                        let cf = local_data_store_clone
                            .index_db
                            .cf_handle("message")
                            .unwrap();
                        local_data_store_clone
                            .index_db
                            .put_cf(cf, composite_key.as_bytes(), assignment.as_bytes())
                            .unwrap();
                        let cf = local_data_store_clone
                            .index_db
                            .cf_handle("message_ordering")
                            .unwrap();
                        local_data_store_clone
                            .index_db
                            .put_cf(cf, order_key.as_bytes(), assignment.as_bytes())
                            .unwrap();
                        local_data_store_clone
                            .file_db
                            .put(assignment_key.as_bytes(), bundle)
                            .unwrap();
                        local_data_store_clone
                            .file_db
                            .put(
                                LAST_MESSAGE_ROW_KEY.as_bytes(),
                                batch_start.to_string().as_bytes(),
                            )
                            .unwrap();
                        processed_count.fetch_add(1, Ordering::Relaxed);
                    })
                })
                .collect();
            join_all(save_handles).await;
        } else {
            data_store.logger.error(format!("Error fetching messages"));
        }
    }

    let total_process_count = data_store
        .get_process_count()
        .expect("Failed to get process count");
    data_store.logger.log(format!(
        "Total processes to process: {}",
        total_process_count
    ));
    let last_process_row_offset = local_data_store
        .file_db
        .get(LAST_PROCESS_ROW_KEY)
        .unwrap()
        .and_then(|bytes| String::from_utf8(bytes.to_vec()).ok())
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(0) as i64;

    for batch_start in (last_process_row_offset..total_process_count).step_by(batch_size) {
        if let Ok(processes) =
            data_store.get_all_processes(batch_start, Some(batch_start + batch_size as i64))
        {
            let save_handles: Vec<JoinHandle<()>> = processes
                .into_iter()
                .map(|process| {
                    let parsed_process = Process::from_bytes(process.clone()).unwrap();
                    let parsed_clone = parsed_process.clone();
                    let local_data_store_clone = Arc::clone(&local_data_store);

                    let (assignment_id, process_key, order_key, assignment_key) =
                        match parsed_process.assignment {
                            Some(assignment) => {
                                let timestamp = parsed_clone.timestamp().unwrap();
                                (
                                    assignment.id.clone(),
                                    format!(
                                        "process:{}:{}",
                                        parsed_process.process.process_id,
                                        assignment.id.clone()
                                    ),
                                    format!(
                                        "process_ordering:{}:{:010}:{:010}:{:015}:{}",
                                        parsed_process.process.process_id,
                                        0,
                                        0,
                                        timestamp,
                                        assignment.id
                                    ),
                                    format!("process_assignment:{}", assignment.id),
                                )
                            }
                            None => {
                                let bundle_data_item =
                                    DataItem::from_bytes(process.clone()).unwrap();
                                let timestamp = bundle_data_item
                                    .tags()
                                    .iter()
                                    .find(|tag| tag.name == "Timestamp")
                                    .unwrap()
                                    .value
                                    .parse::<i64>()
                                    .unwrap();
                                (
                                    bundle_data_item.id().clone(),
                                    format!(
                                        "process:{}:{}",
                                        parsed_process.process.process_id,
                                        bundle_data_item.id().clone()
                                    ),
                                    format!(
                                        "process_ordering:{}:{:010}:{:010}:{:015}:{}",
                                        parsed_process.process.process_id,
                                        0,
                                        0,
                                        timestamp,
                                        bundle_data_item.id()
                                    ),
                                    format!("process_assignment:{}", bundle_data_item.id()),
                                )
                            }
                        };

                    tokio::task::spawn_blocking(move || {
                        let cf = local_data_store_clone
                            .index_db
                            .cf_handle("process")
                            .unwrap();
                        local_data_store_clone
                            .index_db
                            .put_cf(cf, process_key.as_bytes(), assignment_id.as_bytes())
                            .unwrap();
                        let cf = local_data_store_clone
                            .index_db
                            .cf_handle("process_ordering")
                            .unwrap();
                        local_data_store_clone
                            .index_db
                            .put_cf(cf, order_key.as_bytes(), assignment_id.as_bytes())
                            .unwrap();
                        local_data_store_clone
                            .file_db
                            .put(assignment_key.as_bytes(), process.clone())
                            .unwrap();
                        local_data_store_clone
                            .file_db
                            .put(
                                LAST_PROCESS_ROW_KEY.as_bytes(),
                                batch_start.to_string().as_bytes(),
                            )
                            .unwrap();
                    })
                })
                .collect();
            join_all(save_handles).await;
        } else {
            data_store.logger.error(format!("Error fetching processes"));
        }
    }

    data_store.logger.log(format!(
        "Time elapsed in data migration is: {:?}",
        start.elapsed()
    ));
    Ok(())
}
