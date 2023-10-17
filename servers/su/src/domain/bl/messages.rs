use serde::{Serialize, Deserialize};

use super::results::{BuildResult, DepError};
use crate::domain::{UploaderClient, StoreClient};
use crate::domain::core::json::{Message, Process};
use crate::domain::core::binary::{DataBundle};

pub struct MessagesPipeline
{
    data_store: StoreClient
}

#[derive(Serialize, Deserialize)]
pub struct MessagesReturn {
    test: String
}

impl MessagesPipeline {
    pub fn new(data_store: StoreClient) -> Self {
        MessagesPipeline {
            data_store
        }
    }

    pub async fn process(
        &mut self, 
        process_id: Option<String>, 
        from: Option<String>, 
        to: Option<String>
    ) -> Result<String, String> {
        self.read_data(process_id, from, to)
            .await
    }

    pub async fn read_data(
        &mut self, 
        process_id: Option<String>, 
        from: Option<String>, 
        to: Option<String>
    ) -> Result<String, String> {
        let m_r = MessagesReturn {
            test: "ttttt".to_string()
        };
        Ok(serde_json::to_string(&m_r).unwrap())
    }
}
