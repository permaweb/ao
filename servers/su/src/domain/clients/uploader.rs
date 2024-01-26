

use std::sync::Arc;

use reqwest::{Url, Client};

extern crate serde;
use serde::{Serialize, Deserialize};

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


    pub async fn upload(&self, tx: Vec<u8>) -> Result<UploadResult, UploaderErrorType> {
        let node_url_clone = self.node_url.clone();
        let client = Client::new();

        for attempt in 0..5 {
            let response = client
                .post(
                    node_url_clone
                        .join(&format!("tx/{}", "arweave".to_string()))
                        .map_err(|e| UploaderErrorType::UploadError(e.to_string()))?,
                )
                .header("Content-Type", "application/octet-stream")
                .body(tx.clone())
                .send()
                .await;

            match response {
                Ok(resp) if resp.status().is_success() => {
                    // Capture status and headers before consuming the response
                    let response_status = resp.status();
                    let response_headers = resp.headers().clone();

                    let body_str = match resp.text().await {
                        Ok(text) => text,
                        Err(_) => continue, // If there's an error reading the body, try the request again
                    };

                    let msg = format!(
                        "Response Status: {:?}\nResponse Headers: {:?}\nResponse Body: {}",
                        response_status,
                        response_headers,
                        body_str
                    );

                    self.logger.log(format!("irys success message - {}", &msg));
                    let parsed: UploadResult = serde_json::from_str(&body_str)?;
                    return Ok(parsed);
                }
                Ok(resp) => {
                    // Log the error response and try again
                    let status = resp.status();
                    let error_msg = format!("Attempt {}: Upload failed with status {}", attempt + 1, status);
                    self.logger.error(error_msg);

                    // Wait for 1 second before retrying
                    sleep(Duration::from_secs(1)).await;
                }
                Err(e) => {
                    // Log the request error and try again
                    let error_msg = format!("Attempt {}: Request failed with error {:?}", attempt + 1, e);
                    self.logger.error(error_msg);

                    // Wait for 1 second before retrying
                    sleep(Duration::from_secs(1)).await;
                }
            }
        }

        // If all attempts fail, return an error
        Err(UploaderErrorType::UploadError("All attempts to upload failed".to_string()))
    }
}
