
use crate::domain::{StoreClient};

pub struct ReadMessagePipeline
{
    data_store: StoreClient
}

impl ReadMessagePipeline {
    pub fn new() -> Result<Self, String> {
        let data_store = match StoreClient::connect() {
            Ok(d) => d,
            Err(e) => return Err(format!("{:?}", e))
        };
        Ok(ReadMessagePipeline {
            data_store
        })
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
        let result = match serde_json::to_string(&message) {
            Ok(r) => r,
            Err(e) => return Err(format!("{:?}", e))
        };
        Ok(result)
    }
}
