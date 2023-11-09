use std::env;
use dotenv::dotenv;

use crate::domain::{UploaderClient, StoreClient};
use crate::domain::core::json::{Message};
use crate::domain::core::bytes::{DataBundle};
use crate::domain::core::builder::{Builder, BuildResult};

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

impl MessagePipeline {
    pub fn new() -> Result<Self, String> {
        let uploader = UploaderClient::new("https://node2.irys.xyz")?;
        let data_store = match StoreClient::connect() {
            Ok(d) => d,
            Err(e) => return Err(format!("{:?}", e))
        };
        Ok(MessagePipeline {
            data: None,
            build_data: None,
            build_bundle: None,
            error: None,
            sort_key: None,
            uploader,
            data_store
        })
    }

    pub async fn process(&mut self, input: Vec<u8>) -> Result<String, String> {
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
        if let Some(data_val) = &self.data {
            dotenv().ok();
            let wallet_path = env::var("SU_WALLET_PATH").expect("SU_WALLET_PATH must be set");
            match Builder::new("https://node2.irys.xyz", &wallet_path) {
                Ok(b) => {
                    match b.build(data_val.to_vec()).await {
                        Ok(BuildResult {binary: bundle_data, bundle }) => {
                            self.build_data = Some(bundle_data); 
                            self.build_bundle = Some(bundle);
                        },
                        Err(e) => {
                            self.error = Some(format!("{:?}", e))
                        },
                    };
                },
                Err(e) => {
                    self.error = Some(format!("{:?}", e))
                }
            };
        }
        self
    }

    pub async fn commit(&mut self) -> Result<String, String> {
        match &self.error {
            Some(e) => return Err(format!("{:?}", e)),
            None => ()
        };

        let build_data = match &self.build_data {
            Some(data) => data,
            None => return Err("Build error occurred.".to_string()),
        };

        let build_bundle = match &self.build_bundle {
            Some(data) => data,
            None => return Err("Build error occurred.".to_string()),
        };
        
        
        let message = Message::from_bundle(build_bundle)?;

        let uploaded_tx = self.uploader.upload(build_data.to_vec()).await?;

        self.data_store.save_message(&message)?;

        let result = match serde_json::to_string(&uploaded_tx) {
            Ok(r) => r,
            Err(e) => return Err(format!("{:?}", e))
        };
        
        Ok(result)
    }
}
