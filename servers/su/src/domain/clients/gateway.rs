
use async_trait::async_trait;
use reqwest::{Url, Client};

use arweave_rs::network::NetworkInfoClient;

use crate::domain::core::dal::{Gateway, NetworkInfo};

pub struct ArweaveGateway;

#[derive(Debug)]
pub enum GatewayErrorType {
    CheckHeadError(String),
}

impl From<GatewayErrorType> for String {
    fn from(error: GatewayErrorType) -> Self {
        format!("{:?}", error)
    }
}

#[async_trait]
impl Gateway for ArweaveGateway {
    async fn check_head(&self, tx_id: String) -> Result<bool, String> {
        let gateway_url = "https://arweave.net/".to_string();

        let url = match Url::parse(&gateway_url) {
            Ok(u) => u,
            Err(e) => return Err(format!("{}", e))
        };
    
        let client = Client::new();

        let response = client
            .head(
                url
                    .join(&format!("{}", tx_id))
                    .map_err(|e| GatewayErrorType::CheckHeadError(e.to_string()))?,
            )
            .send()
            .await
            .map_err(|e| GatewayErrorType::CheckHeadError(e.to_string()))?;

        let response_status = response.status();

        if !response_status.is_success() {
            return Ok(true);
        } 

        Ok(false)
    }

    async fn network_info(&self) -> Result<NetworkInfo, String> {
        let gateway_url = "https://arweave.net".to_string();
        let url = match Url::parse(&gateway_url) {
            Ok(u) => u,
            Err(e) => {
                return Err(format!("{:?}", e));
            }
        };

        let network_client = NetworkInfoClient::new(url);

        if let Ok(network_info) = network_client.network_info().await {
            let height = network_info.height.clone();
        
            // current block id as base64 string
            let current = network_info.current.to_string();
    
            Ok(NetworkInfo {
                height: format!("{:0>12}", height),
                current
            })
        } else {
            return Err("Failed to fetch network info".to_string());
        }
    }
}