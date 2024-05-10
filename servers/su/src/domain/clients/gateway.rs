use crate::domain::config::AoConfig;
use crate::domain::core::dal::{Gateway, NetworkInfo, TxStatus};
use arweave_rs::network::NetworkInfoClient;
use async_trait::async_trait;
use reqwest::{Client, Url};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};

pub struct ArweaveGateway {
    // Use Mutex to safely share and update state across tasks
    height: Arc<Mutex<String>>,
    current: Arc<Mutex<String>>,
}

#[derive(Debug)]
pub enum GatewayErrorType {
    CheckHeadError(String),
    StatusError(String),
}

impl From<GatewayErrorType> for String {
    fn from(error: GatewayErrorType) -> Self {
        format!("{:?}", error)
    }
}

impl ArweaveGateway {
    pub async fn new() -> Result<Self, String> {
        let network_info = ArweaveGateway::network_info_fetch().await?;

        let height = Arc::new(Mutex::new(network_info.height.clone()));
        let current = Arc::new(Mutex::new(network_info.current.clone()));

        let gateway = ArweaveGateway {
            height: height.clone(),
            current: current.clone(),
        };

        // Spawn a background task to refresh network info every 1 minute
        tokio::spawn(async move {
            loop {
                sleep(Duration::from_secs(5)).await;
                if let Ok(updated_info) = ArweaveGateway::network_info_fetch().await {
                    let mut height_lock = height.lock().await;
                    *height_lock = updated_info.height.clone();
                    let mut current_lock = current.lock().await;
                    *current_lock = updated_info.current.clone();
                }
            }
        });

        Ok(gateway)
    }

    async fn network_info_fetch() -> Result<NetworkInfo, String> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
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
                        current,
                    });
                }
                Err(_) if attempt < 4 => {
                    // Log the failed attempt and wait before retrying
                    println!(
                        "Attempt {}: Failed to fetch network info, retrying...",
                        attempt + 1
                    );
                    sleep(Duration::from_secs(1)).await;
                }
                Err(e) => {
                    // Final attempt failed, return an error
                    return Err(format!(
                        "Failed to fetch network info after multiple attempts: {:?}",
                        e
                    ));
                }
            }
        }

        // This line should not be reachable due to the return statements inside the loop
        Err("Unexpected error in network_info function".to_string())
    }
}

#[async_trait]
impl Gateway for ArweaveGateway {
    async fn check_head(&self, tx_id: String) -> Result<bool, String> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
        let gateway_url = config.gateway_url;

        let url = match Url::parse(&gateway_url) {
            Ok(u) => u,
            Err(e) => return Err(format!("{}", e)),
        };

        let client = Client::new();

        let response = client
            .head(
                url.join(&format!("{}", tx_id))
                    .map_err(|e| GatewayErrorType::CheckHeadError(e.to_string()))?,
            )
            .send()
            .await
            .map_err(|e| GatewayErrorType::CheckHeadError(e.to_string()))?;

        let response_status = response.status();

        if response_status.is_success() {
            return Ok(true);
        }

        Ok(false)
    }

    async fn network_info(&self) -> Result<NetworkInfo, String> {
        let height = self.height.lock().await.clone();
        let current = self.current.lock().await.clone();
        Ok(NetworkInfo { height, current })
    }

    async fn status(&self, tx_id: &String) -> Result<TxStatus, String> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
        let gateway_url = config.gateway_url;

        let url = match Url::parse(&gateway_url) {
            Ok(u) => u,
            Err(e) => return Err(format!("{}", e)),
        };

        let client = Client::new();

        let response = client
            .get(
                url.join(&format!("tx/{}/status", tx_id))
                    .map_err(|e| GatewayErrorType::StatusError(e.to_string()))?,
            )
            .send()
            .await
            .map_err(|e| GatewayErrorType::StatusError(e.to_string()))?;

        if response.status().is_success() {
            let body: serde_json::Value = response
                .json()
                .await
                .map_err(|e| GatewayErrorType::StatusError(e.to_string()))?;

            let status: TxStatus = serde_json::from_value(body).map_err(|e| {
                GatewayErrorType::StatusError(format!("Failed to deserialize tx status: {}", e))
            })?;

            Ok(status)
        } else {
            Err(format!(
                "Failed to get status. Status code: {}",
                response.status()
            ))
        }
    }
}
