use std::{path::PathBuf, sync::Arc};
use std::{str::FromStr};

use reqwest::{Url, Client};

use bundlr_sdk::{bundlr::BundlrBuilder, currency::arweave::ArweaveBuilder, tags::Tag};

extern crate serde;
use serde::{Serialize, Deserialize};

use super::super::bl::results::{DepError, UploadResult, BuildResult};
use super::super::core::binary::{DataItem, DataBundle};
use super::super::core::sequencer::gen_sort_key;

pub struct UploaderClient {
    node_url: Url,
    wallet: PathBuf,
}

#[derive(Debug, Deserialize, Serialize)]
struct IrysResponse {
    id: String,
    timestamp: u64,
    version: String,
    public: String,
    signature: String,
    // Add other fields as needed
}

impl From<bundlr_sdk::error::BuilderError> for DepError {
    fn from(error: bundlr_sdk::error::BuilderError) -> Self {
        DepError::BuildError(format!("Conversion from BuilderError: {}", error))
    }
}

impl From<bundlr_sdk::error::BundlrError> for DepError {
    fn from(error: bundlr_sdk::error::BundlrError) -> Self {
        DepError::BuildError(format!("Conversion from BundlrError: {}", error))
    }
}

impl From<reqwest::Error> for DepError {
    fn from(error: reqwest::Error) -> Self {
        DepError::BuildError(format!("Request error: {}", error))
    }
}

impl UploaderClient {
    pub fn new(node_url: &str, wallet_path: &str) -> Self {
        let wallet = PathBuf::from_str(wallet_path)
            .expect("wallet file does not exist");

        let url = Url::parse(node_url).unwrap();

        UploaderClient {
            node_url: url,
            wallet: wallet,
        }
    }

    pub async fn build(&self, tx: Vec<u8>) -> Result<BuildResult, DepError> {
        let wallet_clone = Arc::new(self.wallet.clone());
        let url_clone = Arc::new(self.node_url.clone());
        
        let item = DataItem::from_bytes(tx).unwrap();
        let sort_key = gen_sort_key(&item).await.unwrap();
        let mut data_bundle = DataBundle::new(sort_key.clone());
        data_bundle.add_item(item);
        let buffer = data_bundle.to_bytes().unwrap();
        let process_id = data_bundle.items[0].target().clone();

        let currency = ArweaveBuilder::new()
            .keypair_path(wallet_clone.to_path_buf()) // Convert Arc<PathBuf> to PathBuf
            .build()
            .expect("Could not create currency instance");

        let bundlr = BundlrBuilder::new()
            .url(url_clone.as_ref().clone()) // Convert Arc<Url> to Url
            .currency(currency)
            .fetch_pub_info()
            .await?
            .build()?;

        let tags = vec![
            Tag::new(&"Bundle-Format".to_string(), &"binary".to_string()),
            Tag::new(&"Bundle-Version".to_string(), &"2.0.0".to_string()),
            Tag::new(&"Sequencer-Sort-Key".to_string(), &sort_key),
            Tag::new(&"Sequencer-Id".to_string(), &"ao-su-1".to_string()),
            Tag::new(&"Ao-Process-Id".to_string(), &process_id),
        ];

        let mut bundlr_tx = bundlr
            .create_transaction(buffer, tags)?;

        bundlr.sign_transaction(&mut bundlr_tx).await?;

        Ok(BuildResult{
            binary: bundlr_tx.as_bytes()?,
            bundle: data_bundle
        })
    }


    pub async fn upload(&self, tx: Vec<u8>) -> Result<UploadResult, DepError> {
        let node_url_clone = self.node_url.clone();
        
        let client = Client::new();

        let response = client
            .post(
                node_url_clone
                    .join(&format!("tx/{}", "arweave".to_string()))
                    .map_err(|e| DepError::UploadError(e.to_string()))?,
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
            let parsed: UploadResult = serde_json::from_str(&body_str).unwrap();
            Ok(parsed)
        } else {
            // println!("Error: {:?}", msg);
            Err(DepError::UploadError("upload failed".to_string()))
        }
    }
}
