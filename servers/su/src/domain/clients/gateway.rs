use crate::domain::config::AoConfig;
use crate::domain::core::dal::{Gateway, GatewayTx, NetworkInfo, TxStatus};
use arweave_rs::network::NetworkInfoClient;
use async_trait::async_trait;
use reqwest::{Client, Url};
use serde_derive::Deserialize;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};

pub struct ArweaveGateway {
    // Use RwLock to safely share and update state across tasks
    height: Arc<RwLock<String>>,
    current: Arc<RwLock<String>>,
}

#[derive(Debug)]
pub enum GatewayErrorType {
    CheckHeadError(String),
    StatusError(String),
    GraphQLError(String),
    JsonParseError(String),
}

impl From<GatewayErrorType> for String {
    fn from(error: GatewayErrorType) -> Self {
        format!("{:?}", error)
    }
}

/*
  Right now we dont need all the fields
  but later we can add to these types to
  pull more data from gql responses
*/
#[derive(Deserialize, Debug, Clone)]
struct Node {
    id: String,
}

#[derive(Deserialize, Debug)]
struct Edge {
    node: Node,
}

#[derive(Deserialize, Debug)]
struct Transactions {
    edges: Vec<Edge>,
}

#[derive(Deserialize, Debug)]
struct Data {
    transactions: Transactions,
}

#[derive(Deserialize, Debug)]
struct GraphQLResponse {
    data: Data,
}

impl ArweaveGateway {
    pub async fn new() -> Result<Self, String> {
        let network_info = ArweaveGateway::network_info_fetch().await?;

        let height = Arc::new(RwLock::new(network_info.height.clone()));
        let current = Arc::new(RwLock::new(network_info.current.clone()));

        let gateway = ArweaveGateway {
            height: height.clone(),
            current: current.clone(),
        };

        // Spawn a background task to refresh network info every 1 minute
        tokio::spawn(async move {
            loop {
                sleep(Duration::from_secs(5)).await;
                if let Ok(updated_info) = ArweaveGateway::network_info_fetch().await {
                    let mut height_lock = height.write().await;
                    *height_lock = updated_info.height.clone();
                    let mut current_lock = current.write().await;
                    *current_lock = updated_info.current.clone();
                }
            }
        });

        Ok(gateway)
    }

    async fn network_info_fetch() -> Result<NetworkInfo, String> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
        let arweave_url = config.arweave_url;
        let url = Url::parse(&arweave_url).map_err(|e| format!("{:?}", e))?;

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
        let arweave_url = config.arweave_url;

        let url = match Url::parse(&arweave_url) {
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
        // bind these with let so they dont drop until returning
        let hl = self.height.read().await;
        let cl = self.current.read().await;
        let height = hl.clone();
        let current = cl.clone();
        Ok(NetworkInfo { height, current })
    }

    async fn status(&self, tx_id: &String) -> Result<TxStatus, String> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
        let arweave_url = config.arweave_url;

        let url = match Url::parse(&arweave_url) {
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

    async fn gql_tx(&self, tx_id: &String) -> Result<GatewayTx, String> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
        let graphql_url = config.graphql_url;
        let client = Client::new();

        let query = serde_json::json!({
            "query": format!(
                "query {{ transactions (ids: [\"{}\"]){{ edges {{ node {{ id }} }} }} }}",
                tx_id
            ),
            "variables": {}
        });

        let query_string = serde_json::to_string(&query)
            .map_err(|e| GatewayErrorType::GraphQLError(e.to_string()))?;

        let response = client
            .post(format!("{}/graphql", graphql_url))
            .header("Content-Type", "application/json")
            .body(query_string)
            .send()
            .await
            .map_err(|e| GatewayErrorType::GraphQLError(e.to_string()))?;

        if response.status().is_success() {
            let body: GraphQLResponse = response
                .json()
                .await
                .map_err(|e| GatewayErrorType::JsonParseError(e.to_string()))?;

            if let Some(edge) = body.data.transactions.edges.get(0) {
                Ok(GatewayTx {
                    id: edge.node.clone().id,
                })
            } else {
                Err("Transaction not found".to_string())
            }
        } else {
            Err(format!("Failed to fetch transaction: {}", response.status()).to_string())
        }
    }
}
