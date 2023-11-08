

use crate::domain::{StoreClient};

pub struct ReadProcessPipeline
{
    data_store: StoreClient
}

impl ReadProcessPipeline {
    pub fn new() -> Result<Self, String> {
        let data_store = match StoreClient::connect() {
            Ok(d) => d,
            Err(e) => return Err(format!("{:?}", e))
        };
        Ok(ReadProcessPipeline {
            data_store
        })
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
        let result = match serde_json::to_string(&process) {
            Ok(r) => r,
            Err(e) => return Err(format!("{:?}", e))
        };
        Ok(result)
    }
}
