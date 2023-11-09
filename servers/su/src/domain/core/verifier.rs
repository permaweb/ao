
use reqwest::{Url, Client};

use super::bytes::DataItem;

pub struct Verifier{}

#[derive(Debug)]
pub enum VerifyErrorType {
    VerifyError(String),
}

impl From<reqwest::Error> for VerifyErrorType {
    fn from(error: reqwest::Error) -> Self {
        VerifyErrorType::VerifyError(format!("{:?}", error))
    }
}

impl Verifier {
    pub fn new() -> Self {
        Verifier {

        }
    }

    pub async fn verify_data_item(&self, data_item: &DataItem) -> Result<(), VerifyErrorType>{
        let tags = data_item.tags();

        if let Some(tag) = tags.iter().find(|tag| tag.name == "ao-load") {
            let gateway_url = "https://arweave.net/".to_string();

            let url = match Url::parse(&gateway_url) {
                Ok(u) => u,
                Err(e) => return Err(VerifyErrorType::VerifyError(format!("{}", e)))
            };
        
            let client = Client::new();
    
            let response = client
                .head(
                    url
                        .join(&format!("{}", tag.value))
                        .map_err(|e| VerifyErrorType::VerifyError(e.to_string()))?,
                )
                .send()
                .await?;

            let response_status = response.status();

            if !response_status.is_success() {
                return Err(VerifyErrorType::VerifyError("Failed to verify ao-load value on the gateway".to_string()));
            } 
        }

        Ok(())
    }
}

