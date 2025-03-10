use std::io;
use std::sync::Arc;
use tokio::time::{sleep, Duration};

use super::super::gateway::ArweaveGateway;
use crate::domain::config::AoConfig;
use crate::domain::core::dal::{DataStore, Gateway, Process, StoreErrorType};
use crate::domain::flows::msg_deephash;

/*
  This program allows us to keep another RocksDB instance
  in sync with a live and running SU in order to create
  an up to date backup of the database.

  This script is using .unwrap() everywhere because we want
  to fail loudly if something goes wrong
*/

pub async fn sync_local_drives(interval: u64) -> io::Result<()> {
    let config = AoConfig::new(None).expect("Failed to read configuration");
    let gateway: Arc<dyn Gateway> = Arc::new(
        ArweaveGateway::new()
            .await
            .expect("Failed to initialize gateway"),
    );

    // New database (writable)
    let write_sync_store = Arc::new(
        super::store::LocalStoreClient::new(
            &config.su_file_sync_db_dir,
            &config.su_index_sync_db_dir,
        )
        .expect("Failed to create LocalStoreClient"),
    );

    println!(
        "Initialized a write store to sync at {} and {}",
        config.su_file_sync_db_dir, config.su_index_sync_db_dir
    );

    loop {
        /*
          Old database (read-only)
          initialize every iteration for a fresh snapshot
        */
        let read_only_local_store = Arc::new(
            super::store::LocalStoreClient::new_read_only(
                &config.su_file_db_dir,
                &config.su_index_db_dir,
            )
            .expect("Failed to create LocalStoreClient"),
        );

        // Fetch all processes from the old database
        let process_keys = get_all_processes(&read_only_local_store).await.unwrap();
        let process_keys_sync = get_all_processes(&write_sync_store).await.unwrap();

        for process_id in process_keys {
            /*
              If the new database has the process get the latest message
              otherwise create the process and there is not latest message
              in the new db so we will start from the beginning
            */
            let latest_message_synced = match process_keys_sync.contains(&process_id) {
                true => match write_sync_store.get_latest_message(&process_id).await {
                    Ok(m) => m,
                    Err(_) => None,
                },
                false => {
                    /*
                      Read the existing process information from the running
                      database, aka the one the running su is using
                    */
                    let process_to_sync = read_only_local_store
                        .get_process(&process_id)
                        .await
                        .unwrap();

                    let assignment_key = format!(
                        "process_assignment:{}",
                        process_to_sync.assignment_id().unwrap()
                    );

                    let process_bundle = read_only_local_store
                        .file_db
                        .get(assignment_key.as_bytes())
                        .unwrap()
                        .unwrap();

                    write_sync_store
                        .save_process(&process_to_sync, &process_bundle)
                        .unwrap();

                    None
                }
            };

            let process = write_sync_store.get_process(&process_id).await.unwrap();

            let mut from = match latest_message_synced {
                Some(message) => Some(message.timestamp().unwrap().to_string()),
                None => None,
            };

            let mut has_next_page = true;

            while has_next_page {
                let mut messages_fetch = read_only_local_store
                    .get_messages(&process, &from, &None, &None)
                    .await
                    .unwrap();

                if messages_fetch.edges.len() >= 1 {
                    if let Some(m) = &messages_fetch.edges[0].node.message {
                        if let Some(type_tag) = m.tags.iter().find(|t| t.name == "Type") {
                            if type_tag.value == "Process" {
                                messages_fetch.edges.remove(0);
                            }
                        }
                    }
                }

                if messages_fetch.edges.len() > 0 {
                    println!(
                        "Syncing {} messages for process {} ...",
                        messages_fetch.edges.len(),
                        process_id
                    );
                }

                for message in messages_fetch.edges.iter() {
                    let gw = Arc::clone(&gateway);

                    let assignment_key = format!(
                        "message_assignment:{}",
                        message.node.assignment_id().unwrap()
                    );

                    let bundle_data_item = read_only_local_store
                        .file_db
                        .get(assignment_key.as_bytes())
                        .unwrap()
                        .unwrap();

                    match write_sync_store.get_message(&message.node.assignment_id().unwrap()) {
                        Err(StoreErrorType::NotFound(_)) => {
                            let deep_hash = msg_deephash(gw, &message.node, &bundle_data_item)
                                .await
                                .unwrap();

                            write_sync_store
                                .save_message(&message.node, &bundle_data_item, Some(&deep_hash))
                                .await
                                .unwrap();
                        }
                        Ok(_) => (),
                        Err(_) => panic!("error querying for old message"),
                    }
                }

                if let Some(last) = messages_fetch.edges.last() {
                    from = Some(last.cursor.clone());
                }

                has_next_page = messages_fetch.page_info.has_next_page;
            }
        }

        /*
          Important, sleep so we dont use the CPU to
          much with the loop
        */
        sleep(Duration::from_secs(interval)).await;
    }
}

pub async fn get_all_processes(
    store: &Arc<super::store::LocalStoreClient>,
) -> Result<Vec<String>, StoreErrorType> {
    let cf = store.index_db.cf_handle("process").ok_or_else(|| {
        StoreErrorType::DatabaseError("Column family 'process' not found".to_string())
    })?;

    let iter = store.index_db.iterator_cf(cf, rocksdb::IteratorMode::Start);
    let mut processes = Vec::new();

    for item in iter {
        let (_key, assignment_id_bytes) = item?;
        let assignment_id = String::from_utf8(assignment_id_bytes.to_vec())?;
        let assignment_key = format!("process_assignment:{}", assignment_id);

        if let Some(process_bundle) = store.file_db.get(assignment_key.as_bytes())? {
            let process = Process::from_bytes(process_bundle)?;
            processes.push(process.process.process_id);
        }
    }

    Ok(processes)
}
