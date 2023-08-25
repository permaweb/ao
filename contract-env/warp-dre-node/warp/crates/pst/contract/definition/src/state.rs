use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use strum_macros::EnumIter;

#[derive(JsonSchema, Serialize, Deserialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PstState {
    pub ticker: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub owner: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evolve: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub can_evolve: Option<bool>,
    pub balances: HashMap<String, u64>,
}

#[derive(JsonSchema, Clone, Debug, Serialize, Deserialize, EnumIter)]
#[serde(rename_all = "camelCase", tag = "function")]
pub enum ContractState {
    State(PstState),
}
