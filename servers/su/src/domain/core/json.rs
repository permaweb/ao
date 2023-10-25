
use serde::{Serialize, Deserialize}; // Import Serde traits

use super::binary::{DataBundle};
use super::sequencer::hash;
use bundlr_sdk::{tags::*};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Process {
    pub process_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Message {
    pub message: MessageInner,
    pub block: Option<Block>,
    pub owner: Owner,
    pub sort_key: String,
    pub process_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MessageInner {
    pub id: String,
    pub tags: Vec<Tag>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Block {
    pub height: u64,
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Owner {
    pub address: String,
    pub key: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SortedMessages {
    pub page_info: PageInfo,
    pub edges: Vec<Edge>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PageInfo {
    pub has_next_page: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Edge {
    pub node: Message,
    pub cursor: String,
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
        let tags = data_bundle.items[0].tags();
        let owner = data_bundle.items[0].owner().clone();
        let target = data_bundle.items[0].target().clone();

        let message_inner = MessageInner {
            id: id,
            tags: tags,
        };

        let owner_bytes = base64_url::decode(&owner).unwrap();
        let address_hash = hash(&owner_bytes);
        let address = base64_url::encode(&address_hash);

        let owner = Owner {
            address: address,
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

impl SortedMessages {
    pub fn from_messages(messages: Vec<Message>, from: Option<String>, to: Option<String>) -> Self {
        let mut sorted_messages = messages.clone();
        sorted_messages.sort_by(|a, b| {
            let a_timestamp = extract_timestamp(&a.sort_key);
            let b_timestamp = extract_timestamp(&b.sort_key);
            a_timestamp.cmp(&b_timestamp)
        });

        let from_timestamp = from.as_ref().map(|from_str| extract_timestamp(from_str)).unwrap_or(0);
        let to_timestamp = to.as_ref().map(|to_str| extract_timestamp(to_str)).unwrap_or(std::i64::MAX);

        let filtered_messages: Vec<Message> = sorted_messages.into_iter().filter(|message| {
            let message_timestamp = extract_timestamp(&message.sort_key);
            message_timestamp >= from_timestamp && message_timestamp <= to_timestamp
        }).collect();

        let page_info = PageInfo { has_next_page: false };

        let edges = filtered_messages.into_iter().map(|message| Edge {
            node: message.clone(),
            cursor: message.sort_key.clone(),
        }).collect();

        SortedMessages { page_info, edges }
    }
}

fn extract_timestamp(sort_key: &str) -> i64 {
    let parts: Vec<&str> = sort_key.split(',').collect();
    if parts.len() >= 2 {
        let num: Result<i64, _> = parts[1].parse();
        if let Ok(timestamp) = num {
            return timestamp;
        } else {
            return -1;
        }
    }
    -1
}

