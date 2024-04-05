use ao_common::models::gql_models::{Node, TransactionConnectionSchema};
use ao_common::models::shared_models::Tag;
use serde::Serialize;
use ao_common::arweave::InternalArweave;
use derive_more::{Display, Error};

use crate::err::{InvalidSchedulerLocationError, SchedulerTagNotFoundError};

const URL_TAG: &str = "Url";
const TTL_TAG: &str = "Time-To-Live";
const SCHEDULER_TAG: &str = "Scheduler";

pub struct Gateway {
    arweave: InternalArweave
}

impl Gateway {
    fn find_tag_value(name: &str, tags: &Vec<Tag>) -> String {
        match tags.iter().find(|tag| tag.name == name) {
            Some(found_tag) => found_tag.value.to_string(),
            None => "".to_string()
        }
    }
    
    fn find_transaction_tags<'a>(err_msg: &'a str, transaction_node: &'a Option<Node>) -> Result<Vec<Tag>, FindTxTagsError> {
        if let Some(node) = transaction_node {
            return Ok(node.tags.clone());
        }
        Err(FindTxTagsError { message: err_msg.to_string() })
    }
    
    async fn gateway_with<'a, T: Serialize, U: for<'de> serde::Deserialize<'de>>(&self, gateway_url: &'a str, query: &'a str, variables: T) -> Result<U, Box<dyn std::error::Error>> {
        let result = self.arweave.query_gateway_with::<T, U>(gateway_url, query, variables).await;
        
        match result {
            Ok(res) => Ok(res),
            Err(e) => Err(e)
        }
    }

    pub async fn load_process_scheduler_with<'a>(&self, gateway_url: &'a str, process_tx_id: &'a str) -> Result<SchedulerResult, Box<dyn std::error::Error>> {
        #[allow(non_snake_case)]
        let GET_TRANSACTIONS_QUERY = r#"
            query GetTransactions ($transactionIds: [ID!]!) {
            transactions(ids: $transactionIds) {
                edges {
                node {
                    tags {
                    name
                    value
                    }
                }
                }
            }
            }
        "#;

        let result = self.gateway_with::<TransactionIds, TransactionConnectionSchema>(
            gateway_url, 
            GET_TRANSACTIONS_QUERY, 
            TransactionIds { transaction_ids: vec![process_tx_id] }
        ).await;
        match result {
            Ok(tx) => {
                let node: Option<Node> = if tx.data.transactions.edges.is_empty() { None } else { Some(tx.data.transactions.edges[0].node.clone()) };
                let tags = Gateway::find_transaction_tags("Process ${process} was not found on gateway ${GATEWAY_URL}", &node);
                match tags {
                    Ok(tags) => {
                        let tag_val = Gateway::find_tag_value(SCHEDULER_TAG, &tags);
                        if tag_val.is_empty() {
                            let mut error = SchedulerTagNotFoundError::new();
                            error.message = "No 'Scheduler' tag found on process".to_string();
                            return Err(Box::new(error));
                        }
                        let load_scheduler = self.load_scheduler_with(gateway_url, &tag_val).await;
                        match load_scheduler {
                            Ok(res) => Ok(res),
                            Err(e) => Err(e)
                        }
                    },
                    Err(e) => Err(Box::new(e))
                }
            },
            Err(e) => Err(e)
        }
    }

    pub async fn load_scheduler_with<'a>(&self, gateway_url: &'a str, wallet_address: &'a str) -> Result<SchedulerResult, Box<dyn std::error::Error>> {
        #[allow(non_snake_case)]
        let GET_SCHEDULER_LOCATION = r#"
            query GetSchedulerLocation ($owner: String!) {
            transactions (
                owners: [$owner]
                tags: [
                { name: "Data-Protocol", values: ["ao"] },
                { name: "Type", values: ["Scheduler-Location"] }
                ]
                # Only need the most recent Scheduler-Location
                sort: HEIGHT_DESC
                first: 1
            ) {
                edges {
                node {
                    tags {
                    name
                    value
                    }
                }
                }
            }
            }
        "#;

        let result = self.gateway_with::<WalletAddress, TransactionConnectionSchema>(gateway_url, GET_SCHEDULER_LOCATION, WalletAddress { owner: wallet_address }).await;        
        match result {
            Ok(tx) => {
                let node = if tx.data.transactions.edges.is_empty() { None } else { Some(tx.data.transactions.edges[0].node.clone()) };
                let tags = Gateway::find_transaction_tags(
                    format!("Could not find 'Scheduler-Location' owner by wallet {}", wallet_address).as_str(), 
                    &node
                );
                match tags {
                    Ok(tags) => {
                        let url = Gateway::find_tag_value(URL_TAG, &tags);
                        let ttl = Gateway::find_tag_value(TTL_TAG, &tags);

                        if url.is_empty() {
                            let mut error = InvalidSchedulerLocationError::new();
                            error.message = "No 'Url' tag found on Scheduler-Location";
                            return Err(Box::new(error));
                        }
                        if ttl.is_empty() {
                            let mut error = InvalidSchedulerLocationError::new();
                            error.message = "No 'Time-To-Live' tag found on Scheduler-Location";
                            return Err(Box::new(error));
                        }
                        return Ok(SchedulerResult {
                            url,
                            ttl,
                            owner: wallet_address.to_string()
                        });
                    },
                    Err(e) => {
                        return Err(Box::new(e));
                    }
                }
            },
            Err(e) => {
                Err(e)
            }
        }
    }
}

#[derive(Serialize)]
struct WalletAddress<'a> {
    owner: &'a str
}

#[derive(Serialize)]
struct TransactionIds<'a> {
    #[serde(rename = "transactionIds")]
    transaction_ids: Vec<&'a str>
}

#[derive(Error, Display, Debug)]
struct FindTxTagsError {
    message: String
}

pub struct SchedulerResult {
    pub url: String,
    pub ttl: String,
    pub owner: String
}

#[cfg(test)]
mod tests {
    use dotenv::dotenv;
    use ao_common::models::{gql_models::{Amount, MetaData}, shared_models::Owner};
    use super::*;

    const GATEWAY_URL: &str = "https://arweave.net";
  
    #[test]
    fn test_find_tag_value() {
        let tags = vec![
            Tag { name: "hello".to_string(), value: "22".to_string() },
            Tag { name: "world".to_string(), value: "tim".to_string() }
        ];

        let value = Gateway::find_tag_value("world", &tags);

        assert!(value != "22".to_string());
        assert!(value == "tim".to_string());
    }

    #[test]
    fn test_find_transaction_tags() {
        let node = Node {
            id: "123".to_string(),
            anchor: "123".to_string(),
            signature: "123".to_string(),
            recipient: "123".to_string(),
            owner: Owner {
                address: "123".to_string(),
                key: "123".to_string()
            },
            fee: Amount {
                winston: "123".to_string(),
                ar: "123".to_string()
            },
            quantity: Amount {
                winston: "123".to_string(),
                ar: "123".to_string()
            },
            data: MetaData {
                size: 123,
                content_type: Some("application/json".to_string())
            },
            tags: vec![
                Tag { name: "hello".to_string(), value: "22".to_string() },
                Tag { name: "world".to_string(), value: "tim".to_string() }
            ],
            block: None,            
            parent: None,
            bundled_in: None
        };

        let result = Gateway::find_transaction_tags("hello world", &Some(node));

        assert!(result.unwrap()[0].name == "hello".to_string());
    }

    #[tokio::test]
    async fn test_load_scheduler_with() {
        env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
        dotenv().ok();

        let gateway = Gateway {
            arweave: InternalArweave::new("../test-utils/wallet.json")
        };
        const WALLET_ADDRESS: &str = "VN7HC19VXz2EcOgJ1ACAZgdYVDK1geWxqqAppddN_io";
        let result = gateway.load_scheduler_with(GATEWAY_URL, WALLET_ADDRESS).await;
        match result {
            Ok(scheduler) => assert!(scheduler.owner == WALLET_ADDRESS.to_string()),
            Err(e) => panic!("{:?}", e)
        };
    }
}