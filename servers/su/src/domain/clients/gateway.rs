
use async_trait::async_trait;
use reqwest::{Url, Client};
use tokio::time::{sleep, Duration};
use arweave_rs::network::NetworkInfoClient;

use crate::domain::core::dal::{Gateway, NetworkInfo};
use crate::config::Config;

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
        let config = Config::new(Some("su".to_string())).expect("Failed to read configuration");
        let gateway_url = config.gateway_url;

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

        if response_status.is_success() {
            return  Ok(true);
        } 

        Ok(false)
    }

    async fn network_info(&self) -> Result<NetworkInfo, String> {
        let config = Config::new(Some("su".to_string())).expect("Failed to read configuration");
        let gateway_url = config.gateway_url;
        let url = Url::parse(&gateway_url).map_err(|e| format!("{:?}", e))?;
    
        let network_client = NetworkInfoClient::new(url);
    
        for attempt in 0..5 {
            match network_client.network_info().await {
                Ok(network_info) => {
                    let height = network_info.height.clone();
                    let current = network_info.current.to_string();
    
                    return Ok(NetworkInfo {
                        height: format!("{:0>12}", height),
                        current
                    });
                },
                Err(_) if attempt < 4 => {
                    // Log the failed attempt and wait before retrying
                    println!("Attempt {}: Failed to fetch network info, retrying...", attempt + 1);
                    sleep(Duration::from_secs(1)).await;
                },
                Err(e) => {
                    // Final attempt failed, return an error
                    return Err(format!("Failed to fetch network info after multiple attempts: {:?}", e));
                }
            }
        }
    
        // This line should not be reachable due to the return statements inside the loop
        Err("Unexpected error in network_info function".to_string())
    }
}