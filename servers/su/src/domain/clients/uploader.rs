

use std::sync::Arc;

use reqwest::{Url, Client};

extern crate serde;
use serde::{Serialize, Deserialize};

use tokio::spawn;
use tokio::time::{sleep, Duration};

use crate::domain::Log;

#[derive(Debug)]
pub enum UploaderErrorType {
    UploadError(String)
}

impl From<UploaderErrorType> for String {
    fn from(error: UploaderErrorType) -> Self {
        format!("{:?}", error)
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UploadResult{
    pub id: String,
    pub timestamp: u64,
}

pub struct UploaderClient<'a> {
    node_url: Url,
    logger: &'a Arc<dyn Log>,
}

#[derive(Debug, Deserialize, Serialize)]
struct IrysResponse {
    id: String,
    timestamp: u64,
    version: String,
    public: String,
    signature: String,
}


impl From<reqwest::Error> for UploaderErrorType {
    fn from(error: reqwest::Error) -> Self {
        UploaderErrorType::UploadError(format!("Request error: {}", error))
    }
}

impl From<serde_json::Error> for UploaderErrorType {
    fn from(error: serde_json::Error) -> Self {
        UploaderErrorType::UploadError(format!("Request error: {}", error))
    }
}

impl<'a> UploaderClient<'a> {
    pub fn new(node_url: &str, logger: &'a Arc<dyn Log>) -> Result<Self, UploaderErrorType> {
        let url = match Url::parse(node_url) {
            Ok(u) => u,
            Err(e) => return Err(UploaderErrorType::UploadError(format!("{}", e)))
        };

        Ok(UploaderClient {
            node_url: url,
            logger
        })
    }


    pub fn upload(&self, tx: Vec<u8>) -> Result<(), UploaderErrorType> {
        let node_url_clone = self.node_url.clone();
        let tx_clone = tx.clone();
        let logger_clone = Arc::clone(&self.logger);

        spawn(async move {
            let client = Client::new();

            for _attempt in 0..100 {
                let response = client
                    .post(
                        node_url_clone
                            .join(&format!("tx/{}", "arweave".to_string()))
                            .expect("Failed to join URL"), // Handle URL joining error
                    )
                    .header("Content-Type", "application/octet-stream")
                    .body(tx_clone.clone())
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        // Handle success
                        logger_clone.log("Upload successful".to_string());
                        break; // Exit the loop on success
                    }
                    Ok(resp) => {
                        // Handle non-success HTTP status
                        logger_clone.error(format!("Non-success status: {}", resp.status()));
                        sleep(Duration::from_secs(1)).await;
                    }
                    Err(e) => {
                        // Handle request error
                        logger_clone.error(format!("Request error: {}", e));
                        sleep(Duration::from_secs(1)).await;
                    }
                }
            }
        });

        Ok(())
    }
}
