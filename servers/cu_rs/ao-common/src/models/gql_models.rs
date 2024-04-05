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
    pub page_info: Option<PageInfo>,
    pub transactions: Edges
}

#[derive(Deserialize)]
pub struct Edges {
    pub edges: Vec<NodeParent>
}

#[derive(Deserialize)]
pub struct NodeParent {
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
    /// parent is deprecated
    pub parent: Option<Parent>,
    /// bundled_in replaces deprecated parent field
    pub bundled_in: Option<Bundle>
}

#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct Amount {
    pub winston: String,
    pub ar: String
}

#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct MetaData {
    pub size: i64,
    #[serde(rename = "type")]
    pub content_type: Option<String>
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