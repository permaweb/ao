use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum HandlerResult {
    NewState(State),
    Balance(u64),
}


#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub ticker: String,
    pub name: Option<String>,
    pub owner: String,
    pub evolve: Option<String>,
    pub can_evolve: Option<bool>,
    pub balances: HashMap<String, u64>,
}
