use rocksdb::WriteBatch;
use std::sync::Arc;

use crate::domain::config::AoConfig;
use super::store::LocalStoreClient;

pub fn merge_dbs(src_file_db_dir: &str, src_index_db_dir: &str, dest_file_db_dir: Option<&str>, dest_index_db_dir: Option<&str>) -> Result<(), Box<dyn std::error::Error>> {
    // Open source databases using LocalStoreClient read-only method
    let src_store = LocalStoreClient::new_read_only(
        &src_file_db_dir.to_string(), 
        &src_index_db_dir.to_string()
    ).map_err(|e| format!("Failed to open source LocalStoreClient: {:?}", e))?;
    
    // Create destination store using provided paths or config
    let dest_store = Arc::new(
        if let (Some(file_dir), Some(index_dir)) = (dest_file_db_dir, dest_index_db_dir) {
            LocalStoreClient::new(&file_dir.to_string(), &index_dir.to_string())
                .map_err(|e| format!("Failed to create LocalStoreClient: {:?}", e))?
        } else {
            let config = AoConfig::new(None)?;
            LocalStoreClient::new(&config.su_file_db_dir, &config.su_index_db_dir)
                .map_err(|e| format!("Failed to create LocalStoreClient: {:?}", e))?
        }
    );
    
    // Merge file database
    let mut file_count = 0;
    
    let file_iterator = src_store.file_db.iterator(rocksdb::IteratorMode::Start);
    
    for item in file_iterator {
        let (key, value) = item?;
        dest_store.file_db.put(key, value)?;
        file_count += 1;
        
        if file_count % 100 == 0 {
            println!("Processed file record {}", file_count);
        }
    }
    
    // Merge index database
    let mut index_batch = WriteBatch::default();
    let mut index_count = 0;
    
    let index_iterator = src_store.index_db.iterator(rocksdb::IteratorMode::Start);
    
    for item in index_iterator {
        let (key, value) = item?;
        index_batch.put(key, value);
        index_count += 1;
        
        if index_count % 10000 == 0 {
            dest_store.index_db.write(index_batch)?;
            index_batch = WriteBatch::default();
            println!("Committed index batch at record {}", index_count);
        }
    }
    
    if !index_batch.is_empty() {
        dest_store.index_db.write(index_batch)?;
        println!("Committed final index batch at record {}", index_count);
    }
    
    println!("Successfully merged {} file records and {} index records", file_count, index_count);
    println!("Source file DB: {}", src_file_db_dir);
    println!("Source index DB: {}", src_index_db_dir);
    
    if let (Some(file_dir), Some(index_dir)) = (dest_file_db_dir, dest_index_db_dir) {
        println!("Destination file DB: {}", file_dir);
        println!("Destination index DB: {}", index_dir);
    } else {
        let config = AoConfig::new(None)?;
        println!("Destination file DB: {}", config.su_file_db_dir);
        println!("Destination index DB: {}", config.su_index_db_dir);
    }
    
    Ok(())
}