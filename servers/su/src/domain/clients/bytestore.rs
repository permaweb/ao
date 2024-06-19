use std::sync::Arc;
use tokio::fs::{File, create_dir_all};
use tokio::io::{AsyncWriteExt};
use tokio::sync::Semaphore;
use std::path::Path;
use tokio::task;
use dashmap::DashMap;

use super::super::config::AoConfig;

/*
  An implementation of byte storage for bundles. This 
  module is used to store and retrieve the bundles built
  by the su. Right now it is implemented using the disk.
*/

pub async fn read_binaries(ids: Vec<(String, Option<String>, String)>, config: &AoConfig) -> Result<DashMap<(String, Option<String>, String), Vec<u8>>, String> {
    let semaphore = Arc::new(Semaphore::new(config.max_read_tasks));
    let mut tasks = Vec::new();
    let binaries = Arc::new(DashMap::new());

    for id in ids {
        let permit = semaphore.clone().acquire_owned().await.unwrap();
        let config_clone = config.clone();
        let binaries_clone = Arc::clone(&binaries);
        /*
          spawn_blocking runs tasks in a thread pool dedicated to blocking 
          tasks. this allows the blocking operation of reading the files
          to run without blocking the main tokio runtime.
        */
        let task = task::spawn_blocking(move || {
            let id_clone = id.clone();
            let filename = create_filepath(id.0, id.1, id.2, &config_clone);
            let binary = read_binary_blocking(&filename);
            match binary {
                Ok(binary) => {
                    binaries_clone.insert(id_clone, binary);
                },
                Err(_) => ()
            };
            drop(permit);
        });
        tasks.push(task);
    }

    for task in tasks {
        task.await.map_err(|e| format!("Task failed: {:?}", e))?;
    }

    Ok(Arc::try_unwrap(binaries).map_err(|_| "Failed to unwrap Arc")?)
}

fn create_filepath(message_id: String, assignment_id: Option<String>, process_id: String, config: &AoConfig) -> String {
    match assignment_id {
        Some(assignment_id) => format!(
            "{}/{}/msg___{}___assign___{}",
            config.su_data_dir,
            process_id,
            message_id,
            assignment_id
        ),
        None => format!("{}/{}/msg___{}", config.su_data_dir, process_id, message_id),
    }
}

fn read_binary_blocking(filepath: &str) -> Result<Vec<u8>, String> {
    let mut file = std::fs::File::open(filepath).map_err(|e| format!("Failed to open file: {:?}", e))?;
    let mut buffer = Vec::new();
    use std::io::Read;
    file.read_to_end(&mut buffer).map_err(|e| format!("Failed to read file: {:?}", e))?;
    Ok(buffer)
}

pub async fn save_msg_binary(
    message_id: String,
    assignment_id: Option<String>,
    process_id: String,
    config: &AoConfig,
    binary: Vec<u8>
) -> Result<(), String> {
    let process_id_path = format!("{}/{}", config.su_data_dir, process_id);
    let dir_path = Path::new(&process_id_path);
    if !dir_path.exists() {
        create_dir_all(&dir_path).await.expect("Failed to create directory");
    }
    let filepath = create_filepath(message_id, assignment_id, process_id, &config);
    let mut file = File::create(filepath).await.map_err(|e| format!("Failed to create file: {:?}", e))?;
    file.write_all(&binary).await.map_err(|e| format!("Failed to write to file: {:?}", e))?;
    Ok(())
}
