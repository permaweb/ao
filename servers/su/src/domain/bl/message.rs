use super::results::{BuildResult, DepError};
use crate::domain::{UploaderClient, StoreClient};
use crate::domain::core::json::{Message, Process, Block};
use crate::domain::core::binary::{DataBundle};

pub struct MessagePipeline
{
    data: Option<Vec<u8>>,
    build_data: Option<Vec<u8>>,
    build_bundle: Option<DataBundle>,
    error: Option<String>,
    sort_key: Option<String>,
    uploader: UploaderClient,
    data_store: StoreClient
}

impl From<DepError> for String {
    fn from(error: DepError) -> Self {
        println!("{:?}", error);
        match error {
            DepError::BuildError(_) => "Build transaction error occurred.".to_string(),
            DepError::UploadError(m) => {
                //TODO: save specific erros to database log
                println!("upload error - {}", m);
                "Upload error occurred.".to_string()
            },
            DepError::SaveTxError(_) => "Save transaction error occurred.".to_string(),
            DepError::DatabaseError(_) => "Database error occurred.".to_string(),
        }
    }
}

impl MessagePipeline {
    pub fn new(uploader: UploaderClient, data_store: StoreClient) -> Self {
        MessagePipeline {
            data: None,
            build_data: None,
            build_bundle: None,
            error: None,
            sort_key: None,
            uploader,
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
        self.sort_key = Some("1234567".to_string());
        self.data = Some(input);
        self
    }

    pub async fn build(&mut self) -> &mut Self {
        // build a bundle and add sort_key as a tag
        if let Some(data_val) = &self.data {
            match self.uploader.build(data_val.to_vec()).await {
                Ok(BuildResult {binary: bundle_data, bundle }) => {
                    self.build_data = Some(bundle_data); 
                    self.build_bundle = Some(bundle);
                },
                Err(_e) => {
                    self.error = Some("Failed to build tx".to_string())
                },
            }
        }
        self
    }

    pub async fn commit(&mut self) -> Result<String, String> {
        let build_data = match &self.build_data {
            Some(data) => data,
            None => return Err("Upload error occurred.".to_string()),
        };

        let build_bundle = match &self.build_bundle {
            Some(data) => data,
            None => return Err("Upload error occurred.".to_string()),
        };
        
        let process = Process::from_bundle(build_bundle);
        let mut message = Message::from_bundle(build_bundle);

        self.data_store.save_process(process)?;

        let uploaded_tx = self.uploader.upload(build_data.to_vec()).await?;

        let block = Block {
            height: uploaded_tx.block,
            timestamp: uploaded_tx.timestamp
        };

        message.block = Some(block);
        self.data_store.save_message(&message)?;
        
        Ok(serde_json::to_string(&uploaded_tx).unwrap())
    }
}
