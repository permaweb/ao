use serde::{Serialize, Deserialize};

use crate::domain::{StoreClient};
use crate::domain::core::json::{SortedMessages};

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
        process_id: String, 
        from: Option<String>, 
        to: Option<String>
    ) -> Result<String, String> {
        self.read_data(process_id, from, to)
            .await
    }

    pub async fn read_data(
        &mut self, 
        process_id: String, 
        from: Option<String>, 
        to: Option<String>
    ) -> Result<String, String> {
        let messages = self.data_store.get_messages(&process_id)?;
        let sorted_messages = SortedMessages::from_messages(messages, from, to);
        Ok(serde_json::to_string(&sorted_messages).unwrap())
    }
}
