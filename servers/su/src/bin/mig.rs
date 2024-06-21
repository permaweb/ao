use dotenv::dotenv;
use futures::future::join_all;
use indicatif::ProgressBar;
use std::env;
use std::io;
use std::sync::Arc;
use tokio::task::{spawn_blocking, JoinHandle};

use su::domain::{bytestore::ByteStore, config, StoreClient};

#[tokio::main]
async fn main() -> io::Result<()> {
    use std::time::Instant;
    let start = Instant::now();
    dotenv().ok();

    let data_store = Arc::new(StoreClient::new().expect("Failed to create StoreClient"));

    let args: Vec<String> = env::args().collect();
    let range: &String = args.get(1).expect("Range argument not provided");

    let (from, to) = parse_range(range);

    let total_count = match to {
        Some(t) => {
          let total = data_store
            .get_message_count()
            .expect("Failed to get message count");
          if t > total {
            total - from
          } else {
            t - from
          }
        },
        None => {
            data_store
                .get_message_count()
                .expect("Failed to get message count")
                - from
        }
    };

    let progress_bar = Arc::new(ProgressBar::new(total_count as u64));

    let data_store = Arc::clone(&data_store);
    let progress_bar = Arc::clone(&progress_bar);

    let config =
        config::AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
    let batch_size = config.migration_batch_size.clone() as usize;
    let bytestore = ByteStore::new(config);

    let mut save_handles: Vec<JoinHandle<()>> = Vec::new();

    for batch_start in (from..from + total_count).step_by(batch_size) {
        let batch_end = if let Some(t) = to {
            std::cmp::min(batch_start + batch_size as i64, t)
        } else {
            batch_start + batch_size as i64
        };

        let result = data_store.get_all_messages(batch_start, Some(batch_end));

        match result {
            Ok(messages) => {
                for message in messages {
                    let msg_id = message.0;
                    let assignment_id = message.1;
                    let bundle = message.2;
                    let process_id = message.3;
                    let bytestore = bytestore.clone();
                    let progress_bar = Arc::clone(&progress_bar);

                    let handle = spawn_blocking(move || {
                        bytestore
                            .save_binary(
                                msg_id.clone(),
                                assignment_id.clone(),
                                process_id.clone(),
                                bundle,
                            )
                            .expect("Failed to save message binary");
                        progress_bar.inc(1);
                    });

                    save_handles.push(handle);
                }
            }
            Err(e) => {
                eprintln!("Error fetching messages: {:?}", e);
            }
        }
    }

    join_all(save_handles).await;

    progress_bar.finish_with_message("All messages processed");

    let duration = start.elapsed();
    println!("Time elapsed in data migration is: {:?}", duration);

    Ok(())
}

fn parse_range(range: &str) -> (i64, Option<i64>) {
    let parts: Vec<&str> = range.split('-').collect();
    let from = parts[0].parse().expect("Invalid starting offset");
    let to = if parts.len() > 1 {
        Some(parts[1].parse().expect("Invalid records to pull"))
    } else {
        None
    };
    (from, to)
}
