use std::env;

use dotenv::dotenv;

#[derive(Debug)]
pub struct Config {
    pub database_url: String,
    pub su_wallet_path: String,
    pub gateway_url: String,
    pub upload_node_url: String,
    pub mode: String,
    pub ao_process_id: String,
    pub scheduler_list_path: String
}

impl Config {
    pub fn new(mode: Option<String>) -> Result<Self, env::VarError> {
        dotenv().ok();
        let mode_out = match mode {
            Some(m) => m,
            None => env::var("MODE")?
        };
        Ok(Config {
            database_url: env::var("DATABASE_URL")?,
            su_wallet_path: env::var("SU_WALLET_PATH")?,
            gateway_url: env::var("GATEWAY_URL")?,
            upload_node_url: env::var("UPLOAD_NODE_URL")?,
            ao_process_id: env::var("AO_PROCESS_ID")?,
            mode: mode_out,
            scheduler_list_path: env::var("SCHEDULER_LIST_PATH")?,
        })
    }
}
