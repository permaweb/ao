use std::env;
use std::path::PathBuf;

use dotenv::dotenv;

use crate::domain::Config;

#[derive(Debug, Clone)]
pub struct AoConfig {
    pub su_wallet_path: String,
    pub graphql_url: String,
    pub arweave_url: String,
    pub upload_node_url: String,
    pub mode: String,
    pub scheduler_list_path: String,
    pub enable_metrics: bool,
    pub enable_process_assignment: bool,
    pub arweave_url_list: Vec<String>,

    /*
      These configurations relate only to the older
      data storage implementation of only Postgres or the
      combination of Postgres + RocksDB
    */
    pub use_disk: bool,
    pub su_data_dir: String,
    pub migration_batch_size: i64,
    pub db_write_connections: u32,
    pub db_read_connections: u32,
    pub database_url: String,
    pub database_read_url: String,
    pub max_read_memory: usize,
    pub process_cache_size: usize,

    /*
      These configurations are for the new local_store
      implementation that runs on only RocksDB
    */
    pub use_local_store: bool,
    pub su_file_db_dir: String,
    pub su_index_db_dir: String,

    pub su_file_sync_db_dir: String,
    pub su_index_sync_db_dir: String,

    pub enable_deep_hash_checks: bool,

    pub current_deephash_version: String,
    pub deephash_recalc_limit: i32,
    pub warmup_delay: u64
}

fn get_db_dirs() -> (String, String, String, String) {
    // Get the user's home directory based on platform
    let home_dir = if cfg!(target_os = "windows") {
        env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string())
    } else {
        env::var("HOME").unwrap_or_else(|_| ".".to_string())
    };

    // Check for SU_FILE_DB_DIR environment variable, default to ~/sudata
    let su_file_db_dir = match env::var("SU_FILE_DB_DIR") {
        Ok(val) => val,
        Err(_) => {
            let mut path = PathBuf::from(&home_dir);
            path.push("sudata");
            path.to_string_lossy().to_string()
        }
    };

    // Check for SU_INDEX_DB_DIR environment variable, default to ~/suindex
    let su_index_db_dir = match env::var("SU_INDEX_DB_DIR") {
        Ok(val) => val,
        Err(_) => {
            let mut path = PathBuf::from(&home_dir);
            path.push("suindex");
            path.to_string_lossy().to_string()
        }
    };

    let su_file_sync_db_dir = match env::var("SU_FILE_SYNC_DB_DIR") {
        Ok(val) => val,
        Err(_) => {
            let mut path = PathBuf::from(&home_dir);
            path.push("sudatasync");
            path.to_string_lossy().to_string()
        }
    };

    let su_index_sync_db_dir = match env::var("SU_INDEX_SYNC_DB_DIR") {
        Ok(val) => val,
        Err(_) => {
            let mut path = PathBuf::from(&home_dir);
            path.push("suindexsync");
            path.to_string_lossy().to_string()
        }
    };

    (
        su_file_db_dir,
        su_index_db_dir,
        su_file_sync_db_dir,
        su_index_sync_db_dir,
    )
}

impl AoConfig {
    pub fn new(mode: Option<String>) -> Result<Self, env::VarError> {
        dotenv().ok();
        let mode_out = match mode {
            Some(m) => m,
            None => env::var("MODE")?,
        };
        let database_read_url = match env::var("DATABASE_READ_URL") {
            Ok(val) => val,
            Err(_e) => env::var("DATABASE_URL")?,
        };
        let use_disk = match env::var("USE_DISK") {
            Ok(val) => val == "true",
            Err(_e) => false,
        };
        let su_data_dir = match use_disk {
            true => env::var("SU_DATA_DIR")?,
            false => "".to_string(),
        };
        let migration_batch_size = match env::var("MIGRATION_BATCH_SIZE") {
            Ok(val) => val.parse().unwrap(),
            Err(_e) => 1000,
        };
        let db_write_connections = match env::var("DB_WRITE_CONNECTIONS") {
            Ok(val) => val.parse().unwrap(),
            Err(_e) => 10,
        };
        let db_read_connections = match env::var("DB_READ_CONNECTIONS") {
            Ok(val) => val.parse().unwrap(),
            Err(_e) => 10,
        };
        let graphql_url = match env::var("GRAPHQL_URL") {
            Ok(val) => val,
            Err(_e) => env::var("GATEWAY_URL")?,
        };
        let arweave_url = match env::var("ARWEAVE_URL") {
            Ok(val) => val,
            Err(_e) => env::var("GATEWAY_URL")?,
        };
        let enable_metrics = match env::var("ENABLE_METRICS") {
            Ok(val) => val == "true",
            Err(_e) => false,
        };
        let max_read_memory = match env::var("MAX_READ_MEMORY") {
            Ok(val) => val.parse().unwrap(),
            Err(_e) => 1_073_741_824,
        };
        let process_cache_size = match env::var("PROCESS_CACHE_SIZE") {
            Ok(val) => val.parse().unwrap(),
            Err(_e) => 20000,
        };
        let enable_process_assignment = match env::var("ENABLE_PROCESS_ASSIGNMENT") {
            Ok(val) => val == "true",
            Err(_e) => false,
        };
        let arweave_url_list: Vec<String> = match env::var("ARWEAVE_URL_LIST") {
            Ok(val) => val.split(',').map(|s| s.trim().to_string()).collect(),
            Err(_e) => vec![
                "https://arweave.net".to_string(),
                "https://g8way.io".to_string(),
            ],
        };
        let use_local_store = match env::var("USE_LOCAL_STORE") {
            Ok(val) => val == "true",
            Err(_e) => false,
        };
        let (su_file_db_dir, su_index_db_dir, su_file_sync_db_dir, su_index_sync_db_dir) =
            get_db_dirs();
        let enable_deep_hash_checks = match env::var("ENABLE_DEEP_HASH_CHECKS") {
            Ok(val) => val == "true",
            Err(_e) => false,
        };

        let current_deephash_version = match env::var("CURRENT_DEEPHASH_VERSION") {
            Ok(val) => val,
            Err(_e) => "1.0".to_string(),
        };

        let deephash_recalc_limit = match env::var("DEEPHASH_RECALC_LIMIT") {
            Ok(val) => val.parse().unwrap(),
            Err(_e) => 400,
        };

        let warmup_delay = match env::var("WARMUP_DELAY") {
            Ok(val) => val.parse().unwrap(),
            Err(_e) => 30,
        };

        Ok(AoConfig {
            database_url: env::var("DATABASE_URL")?,
            database_read_url,
            su_wallet_path: env::var("SU_WALLET_PATH")?,
            graphql_url,
            arweave_url,
            upload_node_url: env::var("UPLOAD_NODE_URL")?,
            mode: mode_out,
            scheduler_list_path: env::var("SCHEDULER_LIST_PATH")?,
            use_disk,
            su_data_dir,
            migration_batch_size,
            db_write_connections,
            db_read_connections,
            enable_metrics,
            max_read_memory,
            process_cache_size,
            enable_process_assignment,
            arweave_url_list,
            use_local_store,
            su_file_db_dir,
            su_index_db_dir,
            enable_deep_hash_checks,
            su_file_sync_db_dir,
            su_index_sync_db_dir,
            current_deephash_version,
            deephash_recalc_limit,
            warmup_delay
        })
    }
}

impl Config for AoConfig {
    fn mode(&self) -> String {
        self.mode.clone()
    }
    fn scheduler_list_path(&self) -> String {
        self.scheduler_list_path.clone()
    }
    fn enable_process_assignment(&self) -> bool {
        self.enable_process_assignment.clone()
    }
    fn enable_deep_hash_checks(&self) -> bool {
        self.enable_deep_hash_checks.clone()
    }
    fn current_deephash_version(&self) -> String {
        self.current_deephash_version.clone()
    }
    fn deephash_recalc_limit(&self) -> i32 {
        self.deephash_recalc_limit.clone()
    }
    fn use_local_store(&self) -> bool {
        self.use_local_store.clone()
    }
    fn use_disk(&self) -> bool {
        self.use_disk.clone()
    }
    fn warmup_delay(&self) -> u64 {
        self.warmup_delay.clone()
    }
}
