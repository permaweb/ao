use async_trait::async_trait;
use serde::Deserialize;

pub use super::json::{JsonErrorType, Message, PaginatedMessages, Process};
pub use super::router::{ProcessScheduler, Scheduler};

/*
Interfaces for core dependencies. Implement these traits
in clients etc... to inject side effects into the core
*/

#[derive(Deserialize)]
pub struct NetworkInfo {
    pub height: String,
    pub current: String,
}

#[derive(Deserialize)]
pub struct TxStatus {
    pub block_height: i32,
    pub number_of_confirmations: i32,
}

#[derive(Deserialize)]
pub struct GatewayTx {
    pub id: String,
}

#[async_trait]
pub trait Gateway: Send + Sync {
    async fn check_head(&self, tx_id: String) -> Result<bool, String>;
    async fn network_info(&self) -> Result<NetworkInfo, String>;
    async fn status(&self, tx_id: &String) -> Result<TxStatus, String>;
    async fn gql_tx(&self, tx_id: &String) -> Result<GatewayTx, String>;
}

pub trait Wallet: Send + Sync {
    fn wallet_json(&self) -> Result<String, String>;
    fn wallet_address(&self) -> Result<String, String>;
}

#[async_trait]
pub trait Signer: Send + Sync {
    async fn sign_tx(&self, buffer: Vec<u8>) -> Result<Vec<u8>, String>;
    fn get_public_key(&self) -> Vec<u8>;
}

pub trait Log: Send + Sync {
    fn log(&self, message: String);
    fn error(&self, message: String);
}
pub trait ScheduleProvider: Send + Sync {
    fn epoch(&self) -> String;
    fn nonce(&self) -> String;
    fn timestamp(&self) -> String;
    fn hash_chain(&self) -> String;
}

pub trait Config: Send + Sync {
    fn su_wallet_path(&self) -> String;
    fn upload_node_url(&self) -> String;
    fn gateway_url(&self) -> String;
    fn mode(&self) -> String;
    fn scheduler_list_path(&self) -> String;
}

#[derive(Debug)]
pub enum UploaderErrorType {
    UploadError(String),
}

impl From<UploaderErrorType> for String {
    fn from(error: UploaderErrorType) -> Self {
        format!("{:?}", error)
    }
}

pub trait Uploader: Send + Sync {
    fn upload(&self, tx: Vec<u8>) -> Result<(), UploaderErrorType>;
}

#[derive(Debug)]
pub enum StoreErrorType {
    DatabaseError(String),
    NotFound(String),
    JsonError(String),
    EnvVarError(String),
    IntError(String),
    MessageExists(String),
}

#[async_trait]
pub trait DataStore: Send + Sync {
    fn save_process(&self, process: &Process, bundle_in: &[u8]) -> Result<String, StoreErrorType>;
    fn get_process(&self, process_id_in: &str) -> Result<Process, StoreErrorType>;
    async fn save_message(
        &self,
        message: &Message,
        bundle_in: &[u8],
    ) -> Result<String, StoreErrorType>;
    async fn get_messages(
        &self,
        process_id_in: &str,
        from: &Option<String>,
        to: &Option<String>,
        limit: &Option<i32>,
    ) -> Result<PaginatedMessages, StoreErrorType>;
    fn get_message(&self, message_id_in: &str) -> Result<Message, StoreErrorType>;
    fn get_latest_message(&self, process_id_in: &str) -> Result<Option<Message>, StoreErrorType>;
    fn save_process_scheduler(
        &self,
        process_scheduler: &ProcessScheduler,
    ) -> Result<String, StoreErrorType>;
    fn get_process_scheduler(
        &self,
        process_id_in: &str,
    ) -> Result<ProcessScheduler, StoreErrorType>;
    fn save_scheduler(&self, scheduler: &Scheduler) -> Result<String, StoreErrorType>;
    fn update_scheduler(&self, scheduler: &Scheduler) -> Result<String, StoreErrorType>;
    fn get_scheduler(&self, row_id_in: &i32) -> Result<Scheduler, StoreErrorType>;
    fn get_scheduler_by_url(&self, url_in: &String) -> Result<Scheduler, StoreErrorType>;
    fn get_all_schedulers(&self) -> Result<Vec<Scheduler>, StoreErrorType>;
    fn check_existing_message(&self, message: &Message) -> Result<(), StoreErrorType>;
}
