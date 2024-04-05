use serde::Deserialize;

use super::shared_models::{Owner, Tag};

#[allow(unused, non_camel_case_types)]
#[derive(Deserialize, Clone)]
pub struct AoNode {
    message: Message,
    block: String,
    owner: Owner,
    process_id: String,
    data: String,
    epoch: i64,
    nonce: i64,
    /// seconds
    timestamp: i64,
    hash_chain: String
}

#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct Message {
    id: String,
    tags: Vec<Tag>,
    signature: String
}

#[allow(unused, non_snake_case)]
#[derive(Deserialize)]
pub struct Module {
    pub Owner: Owner,
    /// the TXID for module
    pub Id: String,
    pub Tags: Vec<Tag>
}