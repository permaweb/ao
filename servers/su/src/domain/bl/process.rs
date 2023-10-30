use super::results::{BuildResult, DepError};
use crate::domain::{UploaderClient, StoreClient};
use crate::domain::core::json::{Process};
use crate::domain::core::binary::{DataItem};

// TODO: combine the pipeline functions into 1 function
// or actually implement the read/build/write pattern
pub struct ProcessPipeline
{
    data: Option<Vec<u8>>,
    build_item: Option<DataItem>,
    error: Option<String>,
    data_store: StoreClient
}

impl ProcessPipeline {
    pub fn new(data_store: StoreClient) -> Self {
        ProcessPipeline {
            data: None,
            build_item: None,
            error: None,
            data_store
        }
    }

    pub async fn process_data(&mut self, input: Vec<u8>) -> Result<String, String> {
        self.read_data(input)
            .await
            .build()
            .await
            .commit()
            .await
    }

    pub async fn read_data(&mut self, input: Vec<u8>) -> &mut Self {
        self.data = Some(input);
        self
    }

    pub async fn build(&mut self) -> &mut Self {
        // build a bundle and add sort_key as a tag
        if let Some(data_val) = &self.data {
            // TODO: remove unwrap and clone
            let d = data_val.clone();
            let data_item = DataItem::from_bytes(d).unwrap();
            self.build_item = Some(data_item);
        }
        self
    }

    pub async fn commit(&mut self) -> Result<String, String> {
        let build_item = match &self.build_item {
            Some(data) => data,
            None => return Err("Data item error occurred.".to_string()),
        };
        
        let mut process = Process::from_data_item(build_item).await;

        self.data_store.save_process(&process)?;
        
        Ok(serde_json::to_string(&process).unwrap())
    }
}
