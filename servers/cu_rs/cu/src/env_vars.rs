use std::env;
use std::sync::{Arc, RwLock};
use dotenv::dotenv;
use lazy_static::lazy_static;

lazy_static! {
    pub static ref UPLOADER_URL: Arc<RwLock<String>> = {
        dotenv().ok();

        Arc::new(RwLock::new(env::var("UPLOADER_URL").unwrap()))
    };
    pub static ref GATEWAY_URL: Arc<RwLock<String>> = {
        dotenv().ok();

        Arc::new(RwLock::new(env::var("GATEWAY_URL").unwrap()))
    };
}

pub fn get_gateway_url() -> String {
    Arc::clone(&GATEWAY_URL).read().unwrap().clone()
}

pub fn get_upload_url() -> String {
    Arc::clone(&UPLOADER_URL).read().unwrap().clone()
}