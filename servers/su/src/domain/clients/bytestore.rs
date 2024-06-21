use dashmap::DashMap;
use std::fs::{create_dir_all, File};
use std::io::Write;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tokio::task;

use super::super::config::AoConfig;

/*
  An implementation of byte storage for bundles. This
  module is used to store and retrieve the bundles built
  by the su. Right now it is implemented using the disk.
*/

#[derive(Clone)]
pub struct ByteStore {
    config: AoConfig,
    semaphore: Arc<Semaphore>,
}

impl ByteStore {
    pub fn new(config: AoConfig) -> Self {
        let semaphore = Arc::new(Semaphore::new(config.max_read_tasks));
        ByteStore { config, semaphore }
    }

    pub async fn read_binaries(
        &self,
        ids: Vec<(String, Option<String>, String)>,
    ) -> Result<DashMap<(String, Option<String>, String), Vec<u8>>, String> {
        let mut tasks = Vec::new();
        let binaries = Arc::new(DashMap::new());

        for id in ids {
            let permit = self.semaphore.clone().acquire_owned().await.unwrap();
            let config_clone = self.config.clone();
            let binaries_clone = Arc::clone(&binaries);
            /*
              spawn_blocking runs tasks in a thread pool dedicated to blocking
              tasks. this allows the blocking operation of reading the files
              to run without blocking the main tokio runtime.
            */
            let task = task::spawn_blocking(move || {
                let id_clone = id.clone();
                let filename = ByteStore::create_filepath(id.0, id.1, id.2, &config_clone);
                let binary = ByteStore::read_binary_blocking(&filename);
                match binary {
                    Ok(binary) => {
                        binaries_clone.insert(id_clone, binary);
                    }
                    Err(_) => (),
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

    fn create_filepath(
        message_id: String,
        assignment_id: Option<String>,
        process_id: String,
        config: &AoConfig,
    ) -> String {
        match assignment_id {
            Some(assignment_id) => format!(
                "{}/{}/msg___{}___assign___{}",
                config.su_data_dir, process_id, message_id, assignment_id
            ),
            None => format!("{}/{}/msg___{}", config.su_data_dir, process_id, message_id),
        }
    }

    fn read_binary_blocking(filepath: &str) -> Result<Vec<u8>, String> {
        let mut file =
            std::fs::File::open(filepath).map_err(|e| format!("Failed to open file: {:?}", e))?;
        let mut buffer = Vec::new();
        use std::io::Read;
        file.read_to_end(&mut buffer)
            .map_err(|e| format!("Failed to read file: {:?}", e))?;
        Ok(buffer)
    }

    pub fn save_binary(
        &self,
        message_id: String,
        assignment_id: Option<String>,
        process_id: String,
        binary: Vec<u8>,
    ) -> Result<(), String> {
        let process_id_path = format!("{}/{}", self.config.su_data_dir, process_id);
        let dir_path = Path::new(&process_id_path);
        if !dir_path.exists() {
            create_dir_all(&dir_path)
                .map_err(|e| format!("Failed to create directory: {:?}", e))?;
        }
        let filepath =
            ByteStore::create_filepath(message_id, assignment_id, process_id, &self.config);
        let file_path = Path::new(&filepath);

        // Check if the file already exists
        if file_path.exists() {
            return Ok(());
        }

        let mut file =
            File::create(filepath).map_err(|e| format!("Failed to create file: {:?}", e))?;
        file.write_all(&binary)
            .map_err(|e| format!("Failed to write to file: {:?}", e))?;
        Ok(())
    }
}
