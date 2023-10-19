extern crate serde;
use serde::{Deserialize, Serialize};

use super::super::core::binary::DataBundle;

#[derive(Debug)]
pub enum DepError {
    BuildError(String),
    UploadError(String),
    SaveTxError(String),
    DatabaseError(String),
    JsonError(String),
    NotFound(String)
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UploadResult{
    pub id: String,
    pub timestamp: u64,
    pub block: u64,
}

pub struct BuildResult{
    pub binary: Vec<u8>,
    pub bundle: DataBundle
}

pub struct TransactionId(pub u64);  
