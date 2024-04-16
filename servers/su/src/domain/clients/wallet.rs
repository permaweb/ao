use std::fs::File;
use std::io::Read;

use base64_url;
use jsonwebkey::JsonWebKey;
use rsa::{pkcs8::DecodePrivateKey, PublicKeyParts, RsaPrivateKey};
use sha2::Digest;

use crate::domain::config::AoConfig;
use crate::domain::core::dal::Wallet;

pub struct FileWallet;

impl Wallet for FileWallet {
    fn wallet_json(&self) -> Result<String, String> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
        let file_path = config.su_wallet_path;
        let mut file = match File::open(&file_path) {
            Ok(f) => f,
            Err(_) => return Err("failed to read wallet file".to_string()),
        };
        let mut key_json = String::new();
        if let Ok(_) = file.read_to_string(&mut key_json) {
            return Ok(key_json);
        } else {
            return Err("Failed to read wallet from file system".to_string());
        }
    }

    fn wallet_address(&self) -> Result<String, String> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
        let file_path = config.su_wallet_path;
        let mut file = match File::open(&file_path) {
            Ok(f) => f,
            Err(_) => return Err("failed to read wallet file".to_string()),
        };
        let mut key_json = String::new();
        if let Ok(_) = file.read_to_string(&mut key_json) {
            let jwk: JsonWebKey = match serde_json::from_str(&key_json) {
                Ok(s) => s,
                Err(_) => return Err("failed to parse the wallet file".to_string()),
            };
            let pem = jwk.key.to_pem();
            let priv_key = RsaPrivateKey::from_pkcs8_pem(&pem).unwrap();
            let modulus = priv_key.to_public_key().n().to_bytes_be();
            let keypair_modulus = modulus.to_vec();
            let mut context = sha2::Sha256::new();
            context.update(&keypair_modulus);
            return Ok(base64_url::encode(&context.finalize().to_vec()));
        } else {
            return Err("Failed to read wallet from file system".to_string());
        }
    }
}
