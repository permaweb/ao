use std::fs::File;
use std::env;
use dotenv::dotenv;
use lazy_static::lazy_static;

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