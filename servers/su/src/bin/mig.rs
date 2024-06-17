use std::io;
use std::sync::Arc;
use tokio::task::JoinHandle;
use std::fs::{File, create_dir_all};
use std::io::prelude::*;
use std::path::Path;
use std::env;
use dotenv::dotenv;

use su::domain::{StoreClient};

#[tokio::main]
async fn main() -> io::Result<()> {
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
            let su_data_dir = env::var("SU_DATA_DIR").expect("SU_DATA_DIR not set");
            let result = data_store.get_all_messages(number, offset);
            match result {
                Ok(messages) => {
                    for message in messages {
                        let msg = message.0;
                        let bundle = message.1;
                        let process_id_path = format!("{}/{}", su_data_dir, message.2);

                        let dir_path = Path::new(&process_id_path);
                        if !dir_path.exists() {
                            create_dir_all(&dir_path).expect("Failed to create directory");
                        }

                        let filename = format!("{}/msg__{}__assign__{}", process_id_path, msg.message_id().unwrap(), msg.assignment_id().unwrap());
                        let mut file = File::create(&filename).expect("Failed to create file");
                        file.write_all(&bundle).expect("Failed to write to file");
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

    Ok(())
}