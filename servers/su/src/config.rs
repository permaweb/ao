use std::env;

use dotenv::dotenv;

#[derive(Debug)]
pub struct Config {
    pub database_url: String,
    pub su_wallet_path: String,
    pub gateway_url: String,
    pub upload_node_url: String
}

impl Config {
    pub fn new() -> Result<Self, env::VarError> {
        dotenv().ok();
        Ok(Config {
            database_url: env::var("DATABASE_URL")?,
            su_wallet_path: env::var("SU_WALLET_PATH")?,
            gateway_url: env::var("GATEWAY_URL")?,
            upload_node_url: env::var("UPLOAD_NODE_URL")?
        })
    }
}
