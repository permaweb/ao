
use std::fs::File;
use std::io::Read;
use std::env;

use crate::domain::core::dal::Wallet;

pub struct FileWallet;

impl Wallet for FileWallet {
    fn wallet_json(&self) -> Result<String, String> {
        let file_path = env::var("SU_WALLET_PATH")
            .expect("SU_WALLET_PATH environment variable not found");
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