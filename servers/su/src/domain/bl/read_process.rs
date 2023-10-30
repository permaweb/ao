use serde::{Serialize, Deserialize};

use crate::domain::{StoreClient};

pub struct ReadProcessPipeline
{
    data_store: StoreClient
}

impl ReadProcessPipeline {
    pub fn new(data_store: StoreClient) -> Self {
        ReadProcessPipeline {
            data_store
        }
    }

    pub async fn process(
        &mut self, 
        process_id: String
    ) -> Result<String, String> {
        self.read_data(process_id)
            .await
    }

    pub async fn read_data(
        &mut self, 
        process_id: String
    ) -> Result<String, String> {
        let process = self.data_store.get_process(&process_id)?;
        Ok(serde_json::to_string(&process).unwrap())
    }
}
