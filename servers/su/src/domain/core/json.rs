
use serde::{Serialize, Deserialize}; // Import Serde traits

use super::binary::{DataItem, DataBundle};

#[derive(Serialize, Deserialize)]
pub struct Process {
    pub process_id: String,
}

#[derive(Serialize, Deserialize)]
pub struct Message {
    pub message: MessageInner,
    pub block: Option<Block>,
    pub owner: Owner,
    pub sort_key: String,
    pub process_id: String,
}

#[derive(Serialize, Deserialize)]
pub struct MessageInner {
    pub id: String,
    pub tags: Vec<(String, String)>,
}

#[derive(Serialize, Deserialize)]
pub struct Block {
    pub height: i32,
    pub timestamp: i32,
}

#[derive(Serialize, Deserialize)]
pub struct Owner {
    pub address: String,
    pub key: String,
}

impl Process {
    pub fn from_bundle(data_bundle: &DataBundle) -> Self {
        let target = data_bundle.items[0].target().clone();
        Process {
            process_id: target
        }
    }
}

impl Message {
    pub fn from_bundle(data_bundle: &DataBundle) -> Self {
        let id = data_bundle.items[0].id().clone();
        let sort_key_clone = data_bundle.sort_key.clone();
        let tags = data_bundle.items[0].tags_as_tuples().clone();
        let owner = data_bundle.items[0].owner().clone();
        let target = data_bundle.items[0].target().clone();

        let message_inner = MessageInner {
            id: id,
            tags: tags,
        };

        let owner = Owner {
            address: "address".to_string(),
            key: owner,
        };

        let process_id = target;

        Message {
            message: message_inner,
            block: None,
            owner,
            sort_key: sort_key_clone,
            process_id,
        }
    }
}
