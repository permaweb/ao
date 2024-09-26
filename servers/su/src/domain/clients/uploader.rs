use std::sync::Arc;

use reqwest::{Client, Url};

extern crate serde;
use serde::{Deserialize, Serialize};

use tokio::spawn;
use tokio::time::{sleep, Duration};

use crate::domain::core::dal::{Uploader, UploaderErrorType};
use crate::domain::Log;

pub struct UploaderClient {
    node_url: Url,
    logger: Arc<dyn Log>,
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

impl UploaderClient {
    pub fn new(node_url: &str, logger: Arc<dyn Log>) -> Result<Self, UploaderErrorType> {
        let url = match Url::parse(node_url) {
            Ok(u) => u,
            Err(e) => return Err(UploaderErrorType::UploadError(format!("{}", e))),
        };

        Ok(UploaderClient {
            node_url: url,
            logger,
        })
    }
}

impl Uploader for UploaderClient {
    fn upload(&self, tx: Vec<u8>) -> Result<(), UploaderErrorType> {
        let node_url_clone = self.node_url.clone();
        let tx_clone = tx.clone();
        let logger_clone = Arc::clone(&self.logger);

        spawn(async move {
            let client = Client::new();
            let mut delay = Duration::from_secs(1);
            let max_delay = Duration::from_secs(32);

            for attempt in 0..100 {
                let response = client
                    .post(
                        node_url_clone
                            .join(&format!("tx/{}", "arweave".to_string()))
                            .expect("Failed to join URL"),
                    )
                    .header("Content-Type", "application/octet-stream")
                    .body(tx_clone.clone())
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        logger_clone.log("Upload successful".to_string());
                        break;
                    }
                    Ok(resp) => {
                        logger_clone.error(format!("Non-success status: {}", resp.status()));
                    }
                    Err(e) => {
                        logger_clone.error(format!("Request error: {}", e));
                    }
                }

                // Exponential backoff logic
                logger_clone.log(format!(
                    "Attempt {} failed, retrying in {:?}",
                    attempt + 1,
                    delay
                ));
                sleep(delay).await;

                // Double the delay for the next attempt, but don't exceed the max delay
                delay = (delay * 2).min(max_delay);
            }
        });

        Ok(())
    }
}
