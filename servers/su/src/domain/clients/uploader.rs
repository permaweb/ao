


use reqwest::{Url, Client};

extern crate serde;
use serde::{Serialize, Deserialize};

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
    pub block: u64,
}

pub struct UploaderClient {
    node_url: Url
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
    pub fn new(node_url: &str) -> Result<Self, UploaderErrorType> {
        let url = match Url::parse(node_url) {
            Ok(u) => u,
            Err(e) => return Err(UploaderErrorType::UploadError(format!("{}", e)))
        };

        Ok(UploaderClient {
            node_url: url
        })
    }


    pub async fn upload(&self, tx: Vec<u8>) -> Result<UploadResult, UploaderErrorType> {
        let node_url_clone = self.node_url.clone();
        
        let client = Client::new();

        let response = client
            .post(
                node_url_clone
                    .join(&format!("tx/{}", "arweave".to_string()))
                    .map_err(|e| UploaderErrorType::UploadError(e.to_string()))?,
            )
            .header("Content-Type", "application/octet-stream")
            .body(tx)
            .send()
            .await?;
            
        // Capture status and headers before consuming the response
        let response_status = response.status();
        // let response_headers = response.headers().clone();

        let body_str = match response.text().await {
            Ok(text) => text,
            Err(_e) => {
                // println!("Error reading the response body: {:?}", e);
                "".to_string() // or you can handle this error differently
            }
        };

        // let msg = format!(
        //     "Response Status: {:?}\nResponse Headers: {:?}\nResponse Body: {}",
        //     response_status,
        //     response_headers,
        //     body_str
        // );

        if response_status.is_success() {
            let parsed: UploadResult = serde_json::from_str(&body_str)?;
            Ok(parsed)
        } else {
            // println!("Error: {:?}", msg);
            Err(UploaderErrorType::UploadError("upload failed".to_string()))
        }
    }
}
