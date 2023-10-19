use serde::{Serialize, Deserialize};

use crate::domain::{StoreClient};
use crate::domain::core::json::{SortedMessages};

pub struct ReadMessagePipeline
{
    data_store: StoreClient
}

impl ReadMessagePipeline {
    pub fn new(data_store: StoreClient) -> Self {
        ReadMessagePipeline {
            data_store
        }
    }

    pub async fn process(
        &mut self, 
        message_id: String
    ) -> Result<String, String> {
        self.read_data(message_id)
            .await
    }

    pub async fn read_data(
        &mut self, 
        message_id: String
    ) -> Result<String, String> {
        let message = self.data_store.get_message(&message_id)?;
        Ok(serde_json::to_string(&message).unwrap())
    }
}
