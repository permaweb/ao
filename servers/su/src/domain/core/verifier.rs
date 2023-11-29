
use std::sync::Arc;

use super::bytes::DataItem;
use super::dal::Gateway;

pub struct Verifier {
    gateway: Arc<dyn Gateway>
}

#[derive(Debug)]
pub enum VerifyErrorType {
    VerifyError(String),
}

impl From<reqwest::Error> for VerifyErrorType {
    fn from(error: reqwest::Error) -> Self {
        VerifyErrorType::VerifyError(format!("{:?}", error))
    }
}

impl From<String> for VerifyErrorType {
    fn from(error: String) -> Self {
        VerifyErrorType::VerifyError(error)
    }
}

impl Verifier {
    pub fn new(gateway: Arc<dyn Gateway>) -> Self {
        Verifier {
            gateway
        }
    }

    pub async fn verify_data_item(&self, data_item: &DataItem) -> Result<(), VerifyErrorType>{
        let tags = data_item.tags();

        // if this is a data attestation request the head on the gateway
        if let Some(tag) = tags.iter().find(|tag| tag.name == "ao-load") {
            let check = self.gateway.check_head(tag.value.clone()).await?;

            if !check {
                return Err(VerifyErrorType::VerifyError("Failed to verify ao-load value on the gateway".to_string()));
            } 
        }

        Ok(())
    }
}

