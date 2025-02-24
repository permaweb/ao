use async_trait::async_trait;
use serde::Deserialize;

pub use super::bytes::DataItem;
pub use super::json::{JsonErrorType, Message, PaginatedMessages, Process};
pub use super::router::{ProcessScheduler, Scheduler};
pub use super::tags::Tag;

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

#[derive(Deserialize, Debug, Clone)]
pub struct GatewayTx {
    pub id: String,
    pub signature: String,
    pub anchor: Option<String>,
    pub tags: Vec<Tag>,
    pub recipient: Option<String>,
}

#[async_trait]
pub trait Gateway: Send + Sync {
    async fn check_head(&self, tx_id: String) -> Result<bool, String>;
    async fn network_info(&self) -> Result<NetworkInfo, String>;
    async fn status(&self, tx_id: &String) -> Result<TxStatus, String>;
    async fn gql_tx(&self, tx_id: &String) -> Result<GatewayTx, String>;
    async fn raw(&self, tx_id: &String) -> Result<Vec<u8>, String>;
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

pub trait ScheduleProvider {
    fn epoch(&self) -> String;
    fn nonce(&self) -> String;
    fn timestamp(&self) -> String;
    fn hash_chain(&self) -> String;
}

pub trait Config: Send + Sync {
    fn mode(&self) -> String;
    fn scheduler_list_path(&self) -> String;
    fn enable_process_assignment(&self) -> bool;
    fn enable_deep_hash_checks(&self) -> bool;
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

impl From<serde_json::Error> for StoreErrorType {
    fn from(error: serde_json::Error) -> Self {
        StoreErrorType::JsonError(format!("data store json error: {}", error))
    }
}

impl From<StoreErrorType> for String {
    fn from(error: StoreErrorType) -> Self {
        format!("{:?}", error)
    }
}

impl From<String> for StoreErrorType {
    fn from(error: String) -> Self {
        StoreErrorType::DatabaseError(format!("{:?}", error))
    }
}

impl From<std::string::FromUtf8Error> for StoreErrorType {
    fn from(err: std::string::FromUtf8Error) -> StoreErrorType {
        StoreErrorType::JsonError(format!("UTF-8 conversion error: {:?}", err))
    }
}

#[async_trait]
pub trait DataStore: Send + Sync {
    fn save_process(&self, process: &Process, bundle_in: &[u8]) -> Result<String, StoreErrorType>;
    async fn get_process(&self, process_id_in: &str) -> Result<Process, StoreErrorType>;
    async fn save_message(
        &self,
        message: &Message,
        bundle_in: &[u8],
        deep_hash: Option<&String>,
    ) -> Result<String, StoreErrorType>;
    async fn get_messages(
        &self,
        process: &Process,
        from: &Option<String>,
        to: &Option<String>,
        limit: &Option<i32>,
    ) -> Result<PaginatedMessages, StoreErrorType>;
    fn get_message(&self, message_id_in: &str) -> Result<Message, StoreErrorType>;
    async fn get_latest_message(
        &self,
        process_id_in: &str,
    ) -> Result<Option<Message>, StoreErrorType>;
    fn check_existing_message(&self, message_id: &String) -> Result<(), StoreErrorType>;
    async fn check_existing_deep_hash(&self, process_id: &String, deep_hash: &String) -> Result<(), StoreErrorType>;
}

#[async_trait]
pub trait RouterDataStore: Send + Sync {
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
}

pub struct MockRouterDataStore;

#[async_trait]
impl RouterDataStore for MockRouterDataStore {
    fn save_process_scheduler(
        &self,
        _process_scheduler: &ProcessScheduler,
    ) -> Result<String, StoreErrorType> {
        unreachable!("save_process_scheduler is not implemented in MockRouterDataStore");
    }

    fn get_process_scheduler(
        &self,
        _process_id_in: &str,
    ) -> Result<ProcessScheduler, StoreErrorType> {
        unreachable!("get_process_scheduler is not implemented in MockRouterDataStore");
    }

    fn save_scheduler(&self, _scheduler: &Scheduler) -> Result<String, StoreErrorType> {
        unreachable!("save_scheduler is not implemented in MockRouterDataStore");
    }

    fn update_scheduler(&self, _scheduler: &Scheduler) -> Result<String, StoreErrorType> {
        unreachable!("update_scheduler is not implemented in MockRouterDataStore");
    }

    fn get_scheduler(&self, _row_id_in: &i32) -> Result<Scheduler, StoreErrorType> {
        unreachable!("get_scheduler is not implemented in MockRouterDataStore");
    }

    fn get_scheduler_by_url(&self, _url_in: &String) -> Result<Scheduler, StoreErrorType> {
        unreachable!("get_scheduler_by_url is not implemented in MockRouterDataStore");
    }

    fn get_all_schedulers(&self) -> Result<Vec<Scheduler>, StoreErrorType> {
        unreachable!("get_all_schedulers is not implemented in MockRouterDataStore");
    }
}


pub trait CoreMetrics: Send + Sync {
    fn get_process_observe(&self, duration: u128);
    fn get_message_observe(&self, duration: u128);
    fn get_messages_observe(&self, duration: u128);
    fn read_message_data_observe(&self, duration: u128);
    fn write_item_observe(&self, duration: u128);
    fn write_assignment_observe(&self, duration: u128);
    fn acquire_write_lock_observe(&self, duration: u128);
    fn failed_message_save(&self);
}
