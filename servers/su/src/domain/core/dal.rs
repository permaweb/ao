use async_trait::async_trait;
use std::sync::Arc;
use tokio::sync::Mutex;

/*
Interfaces for core dependencies. Implement these traits 
in clients etc... to inject side effects into the core
*/

pub struct NetworkInfo {
    pub height: String,
    pub current: String
}

#[async_trait]
pub trait Gateway {
    async fn check_head(&self, tx_id: String) -> Result<bool, String>;
    async fn network_info(&self) -> Result<NetworkInfo, String>;
}

pub trait Wallet {
    fn wallet_json(&self) -> Result<String, String>;
    fn wallet_address(&self) -> Result<String, String>;
}

#[async_trait]
pub trait Signer {
    async fn sign_tx(&self, buffer: Vec<u8>) -> Result<Vec<u8>, String>;
    fn get_public_key(&self) -> Vec<u8>;
}

pub trait Log: Send + Sync {
    fn log(&self, message: String);
    fn error(&self, message: String);
}

pub trait ScheduleProvider {
    fn epoch(&self) -> String;
    fn nonce(&self) -> String;
    fn timestamp(&self) -> String;
    fn last_hash(&self) -> String;
}