use std::io;
use std::sync::Arc;
use tokio::task::JoinHandle;
use std::env;
use dotenv::dotenv;

use su::domain::{StoreClient, bytestore, config};

#[tokio::main]
async fn main() -> io::Result<()> {
    use std::time::Instant;
    let start = Instant::now();
    dotenv().ok();

    let data_store = Arc::new(StoreClient::new().expect("Failed to create StoreClient"));

    let args: Vec<String> = env::args().collect();
    let number: i64 = args.get(1).expect("Number argument not provided").parse().expect("Failed to parse number argument");

    let total_count = data_store.get_message_count().expect("Failed to get message count");

    let offsets: Vec<i64> = (0..total_count).step_by(number as usize).collect();

    let mut handles: Vec<JoinHandle<()>> = Vec::new();

    for offset in offsets {
        let data_store = Arc::clone(&data_store);

        let handle = tokio::spawn(async move {
            let result = data_store.get_all_messages(number, offset);
            let config = config::AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
            match result {
                Ok(messages) => {
                    for message in messages {
                        let msg_id = message.0;
                        let assignment_id = message.1;
                        let bundle = message.2;
                        let process_id = message.3;
                        bytestore::save_msg_binary(msg_id.clone(), assignment_id.clone(), process_id.clone(), &config, bundle).await.expect("Failed to save message binary");
                    }
                }
                Err(e) => {
                    eprintln!("Error fetching messages: {:?}", e);
                }
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.await.unwrap();
    }

    let duration = start.elapsed();
    println!("Time elapsed in data migration is: {:?}", duration);

    Ok(())
}