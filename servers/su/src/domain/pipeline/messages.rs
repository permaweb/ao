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
    pub fn new() -> Result<Self, String> {
        let data_store = match StoreClient::connect() {
            Ok(d) => d,
            Err(e) => return Err(format!("{:?}", e))
        };
        Ok(MessagesPipeline {
            data_store
        })
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
        let sorted_messages = SortedMessages::from_messages(messages, from, to)?;
        let result = match serde_json::to_string(&sorted_messages) {
            Ok(r) => r,
            Err(e) => return Err(format!("{:?}", e))
        };
        Ok(result)
    }
}
