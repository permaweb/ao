use std::env;

use dotenv::dotenv;

#[derive(Debug)]
pub struct Config {
    pub database_url: String,
}

impl Config {
    pub fn new() -> Result<Self, env::VarError> {
        dotenv().ok();
        Ok(Config {
            database_url: env::var("DATABASE_URL")?,
        })
    }
}
