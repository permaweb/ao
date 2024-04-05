use serde::{Deserialize, Serialize};

#[allow(unused)]
#[derive(Deserialize, Serialize, Clone)]
pub struct Tag {
    pub name: String,
    pub value: String
}

#[allow(unused)]
#[derive(Deserialize, Clone)]
pub struct Owner { 
    address: String, 
    key: String
}