use std::env;

use dotenv::dotenv;

use crate::domain::Config;

#[derive(Debug, Clone)]
pub struct AoConfig {
    pub database_url: String,
    pub database_read_url: String,
    pub su_wallet_path: String,
    pub gateway_url: String,
    pub upload_node_url: String,
    pub mode: String,
    pub scheduler_list_path: String,
    pub use_disk: bool,
    pub su_data_dir: String,
    pub migration_batch_size: i64,
    pub db_write_connections: u32,
    pub db_read_connections: u32,
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
        Ok(AoConfig {
            database_url: env::var("DATABASE_URL")?,
            database_read_url,
            su_wallet_path: env::var("SU_WALLET_PATH")?,
            gateway_url: env::var("GATEWAY_URL")?,
            upload_node_url: env::var("UPLOAD_NODE_URL")?,
            mode: mode_out,
            scheduler_list_path: env::var("SCHEDULER_LIST_PATH")?,
            use_disk,
            su_data_dir: env::var("SU_DATA_DIR")?,
            migration_batch_size,
            db_write_connections,
            db_read_connections,
        })
    }
}

impl Config for AoConfig {
    fn su_wallet_path(&self) -> String {
        self.su_wallet_path.clone()
    }
    fn upload_node_url(&self) -> String {
        self.upload_node_url.clone()
    }
    fn gateway_url(&self) -> String {
        self.gateway_url.clone()
    }
    fn mode(&self) -> String {
        self.mode.clone()
    }
    fn scheduler_list_path(&self) -> String {
        self.scheduler_list_path.clone()
    }
}
