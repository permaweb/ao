use serde::{Deserialize, Serialize};

use super::shared_models::{Owner, Tag};

#[derive(Serialize)]
pub struct GraphqlInput<T> {
    query: String,
    variables: T
}

#[derive(Deserialize)]
pub struct TransactionConnectionSchema {
    pub data: Transactions
}

#[derive(Deserialize)]
pub struct Transactions {
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,
    pub edges: Vec<TransactionEdge>
}

#[derive(Deserialize)]
pub struct TransactionEdge {
    pub node: Node
}

#[derive(Deserialize, Clone)]
pub struct Node {
    pub id: String,
    pub anchor: String,
    pub signature: String,
    pub recipient: String,
    pub owner: Owner,
    pub fee: Amount,
    pub quantity: Amount,
    pub data: MetaData,
    pub tags: Vec<Tag>,
    pub block: Option<Block>,
    pub parent: Option<Parent>,
    /// replaces deprecated parent field
    pub bundled_in: Option<Bundle>
}

#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct Amount {
    winston: String,
    ar: String
}

#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct MetaData {
    size: i64,
    #[serde(rename = "type")]
    content_type: Option<String>
}

#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct Block {
    id: String,
    timestamp: i64,
    height: i64,
    /// previous means previous id
    previous: String
}

/// Deprecate
#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct Parent {
    id: String
}

#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct Bundle {
    id: String
}

#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct PageInfo {
    #[serde(rename = "hasNextPage")]
    has_next_page: bool
}