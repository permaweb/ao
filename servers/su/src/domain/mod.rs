use std::env;

mod bl;
mod clients;
mod core;

use bl::message::{MessagePipeline};
use bl::messages::{MessagesPipeline};
use bl::read_message::{ReadMessagePipeline};

use clients::uploader::{UploaderClient};
use clients::store::{StoreClient};

pub fn write_message_pipeline() -> MessagePipeline {
    // Get the wallet path from the environment variable.
    let wallet_path = env::var("SU_WALLET_PATH").expect("SU_WALLET_PATH must be set");
    let uploader = UploaderClient::new("https://node2.irys.xyz", &wallet_path);
    let data_store = StoreClient::connect();
    MessagePipeline::new(uploader, data_store)
}

pub fn read_messages_pipeline() -> MessagesPipeline {
    let data_store = StoreClient::connect();
    MessagesPipeline::new(data_store)
}

pub fn read_message_pipeline() -> ReadMessagePipeline {
    let data_store = StoreClient::connect();
    ReadMessagePipeline::new(data_store)
}