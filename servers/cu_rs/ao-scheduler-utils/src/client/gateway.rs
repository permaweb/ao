use ao_common::models::gql_models::{Node, TransactionConnectionSchema};
use ao_common::models::shared_models::Tag;
use serde::Serialize;
use reqwest::Error;
use ao_common::arweave::InternalArweave;
use derive_more::{Display, Error};

use crate::err::InvalidSchedulerLocationError;

const URL_TAG: &str = "Url";
const TTL_TAG: &str = "Time-To-Live";
const _SCHEDULER_TAG: &str = "Scheduler";

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
    
    fn find_transaction_tags<'a>(err_msg: &'a str, transaction: &'a Option<Node>) -> Result<Vec<Tag>, FindTxTagsError> {
        if let Some(tx) = transaction {
            return Ok(tx.tags.clone());
        }
        Err(FindTxTagsError { message: err_msg.to_string() })
    }
    
    async fn gateway_with<'a, T: Serialize, U: for<'de> serde::Deserialize<'de>>(&self, gateway_url: &'a str, query: &'a str, variables: T) -> Result<U, Error> {
        let result = self.arweave.query_gateway_with::<T, U>(gateway_url, query, variables).await;
    
        match result {
            Ok(res) => Ok(res),
            Err(e) => Err(e)
        }
    }

    pub async fn load_process_scheduler_with<'a>(&self, _gateway_url: &'a str) {

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
                let tags = Gateway::find_transaction_tags(
                    format!("Could not find 'Scheduler-Location' owner by wallet {}", wallet_address).as_str(), 
                    &Some(tx.data.edges[0].node.clone())
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
            Err(e) => Err(Box::new(e))
        }
    }
}

#[derive(Serialize)]
struct WalletAddress<'a> {
    owner: &'a str
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
    use super::*;

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
}