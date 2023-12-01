
use std::fs::File;
use std::io::Read;

use crate::domain::core::dal::Wallet;
use crate::config::Config;

pub struct FileWallet;

impl Wallet for FileWallet {
    fn wallet_json(&self) -> Result<String, String> {
        let config = Config::new().expect("Failed to read configuration");
        let file_path = config.su_wallet_path;
        let mut file = match File::open(&file_path) {
            Ok(f) => f,
            Err(_) => return Err("failed to read wallet file".to_string())
        };
        let mut key_json = String::new();
        if let Ok(_) = file.read_to_string(&mut key_json) {
            return Ok(key_json)
        } else {
            return Err("Failed to read wallet from file system".to_string())
        }
    }
}