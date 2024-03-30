use std::env;
use dotenv::dotenv;
use lazy_static::lazy_static;

struct Config {
    mode: String
}

impl Config {
    fn new() -> Self {
        dotenv().ok();
        
        Config {
            mode: match env::var("NODE_CONFIG_ENV") {
                Ok(mode) => mode,
                Err(e) => panic!("Error getting mode config: {:?}", e)
            }
        }
    }
}

lazy_static! {
    pub static ref MODE: String = {
        dotenv().ok();

        let mode = env::var("NODE_CONFIG_ENV");
        match mode {
            Ok(mode) => mode,
            Err(e) => panic!("NODE_CONFIG_ENV must be defined")
        }
    };
}