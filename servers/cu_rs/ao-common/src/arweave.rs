use arweave_rs::{Arweave, ArweaveBuilder};
use futures::{Future, FutureExt};
use reqwest::{Response, Client, Error, Url};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, pin::Pin};
#[allow(unused)]
use log::{error, info};
use crate::errors::QueryGatewayErrors;
use crate::network::utils::get_content_type_headers;
use crate::models::gql_models::{Node, TransactionConnectionSchema};
use crate::models::shared_models::Tag;

pub struct InternalArweave {
    internal_arweave: Arweave,
    client: Client
}

impl InternalArweave {
    pub fn new(keypair_path: &str) -> Self {
        InternalArweave {
            internal_arweave: InternalArweave::create_wallet_client(keypair_path),
            client: Client::new()
        }
    }

    pub fn create_wallet_client(keypair_path: &str) -> Arweave {
        let arweave_builder = ArweaveBuilder::new();
        
        let mut path = PathBuf::new();
        path.push(keypair_path);
        arweave_builder
            .keypair_path(path)
            .base_url(Url::parse("https://arweave.net").unwrap())
            .build().unwrap()
        // arweave.upload_file_from_path(file_path, additional_tags, fee);
    }

    pub fn address_with<'a>(&'a self) -> Box<dyn Fn() -> String + 'a> {
        Box::new(|| self.internal_arweave.get_wallet_address().unwrap().clone())
    }

    pub fn build_sign_dataitem_with(&self) -> impl FnOnce(Vec<u8>, Vec<Tag>, String) -> Pin<Box<dyn Future<Output = DataItem>>> {
        move |data: Vec<u8>, tags: Vec<Tag>, anchor: String| {
            async move {
                DataItem {
                    id: "".to_string(),
                    data,
                    tags,
                    anchor            
                }
            }.boxed()
        }
    }

    /**
     * @typedef Env1
     * @property {fetch} fetch
     * @property {string} GATEWAY_URL
     *
     * @callback LoadTransactionMeta
     * @param {string} id - the id of the process whose src is being loaded
     * @returns {Async<z.infer<typeof transactionConnectionSchema>['data']['transactions']['edges'][number]['node']>}
     *
     * @param {Env1} env
     * @returns {LoadTransactionMeta}
    */
    pub async fn load_tx_meta_with(self, gateway_url: &str, id: &str) -> Result<Node, QueryGatewayErrors> {
        #[allow(non_snake_case)]
        let GET_PROCESSES_QUERY = r#"
            query GetProcesses ($processIds: [ID!]!) {
            transactions(ids: $processIds) {
                edges {
                node {
                    id
                    signature
                    anchor
                    owner {
                    address
                    }
                    tags {
                    name
                    value
                    }
                }
                }
            }
        }"#;

        let result = self.query_gateway_with::<ProcessIds, TransactionConnectionSchema>(gateway_url, GET_PROCESSES_QUERY, ProcessIds {
            process_ids: vec![id.to_string()]
        }).await;

        match result {
            Ok(tx) => {
                Ok(tx.data.transactions.edges[0].node.clone())
            },
            Err(e) => {
                error!("Error Encountered when fetching transaction {} from gateway {}", id, gateway_url);
                Err(e)
            }
        }
    }

    /**
    * @typedef Env2
    * @property {fetch} fetch
    * @property {string} GATEWAY_URL
    *
    * @callback LoadTransactionData
    * @param {string} id - the id of the process whose src is being loaded
    * @returns {Async<Response>}
    *
    * @param {Env2} env
    * @returns {LoadTransactionData}
    */
    pub async fn load_tx_data_with<'a>(&'a self, gateway_url: &'a str, id: &'a str) -> Result<Response, Error> {
        let result = self.client.get(format!("{}/raw/{}", gateway_url, id)).send().await;
        match result {
            Ok(res) => Ok(res),
            Err(e) => {
                error!("Error Encountered when fetching raw data for transaction {} from gateway {}", id, gateway_url);
                Err(e)
            }
        }
    }

    pub async fn query_gateway_with<'a, T: Serialize, U: for<'de> Deserialize<'de>>(&'a self, gateway_url: &'a str, query: &'a str, variables: T) -> 
        Result<U, QueryGatewayErrors> {        
        let result = self.client.post(format!("{}{}", gateway_url, "/graphql"))
            .headers(get_content_type_headers())
            .body(
                serde_json::to_string(&GraphqlQuery {
                    query: query.to_string(),
                    variables
                }).unwrap()
            )
            .send()
            .await;

        match result {
            Ok(res) => {
                let body_str = res.text().await.unwrap();
                match serde_json::from_str::<U>(&body_str) {
                    Ok(res) => Ok(res),
                    Err(e) => {                        
                        error!("Serialization error {:?}", e);
                        Err(QueryGatewayErrors::Serialization(Some(Box::new(e))))
                    }
                }
            },
            Err(e) => {
                error!("Error Encountered when querying gateway");
                Err(QueryGatewayErrors::Network(Some(Box::new(e))))
            }
        }
    }

    pub async fn upload_data_item_with<'a, U: for<'de> Deserialize<'de>>(&'a self, gateway_url: String, data_item: &DataItem) -> Result<U, Error> {
        let result = self.client
            .post(format!("{}/tx/arweave", gateway_url))
            .headers(get_content_type_headers())
            .body(serde_json::to_string(data_item).unwrap())
            .send()
            .await;

        match result {
            Ok(res) => Ok(res.json::<U>().await.unwrap()),
            Err(e) => {
                error!("Error while communicating with uploader:");
                Err(e)
            }
        }
    }
}

#[derive(Serialize)]
pub struct DataItem {
    pub id: String,
    pub data: Vec<u8>,
    pub tags: Vec<Tag>,
    pub anchor: String   
}

#[derive(Serialize)]
struct GraphqlQuery<T> {
    query: String,
    variables: T
}

/// variables type
#[derive(Serialize)]
struct ProcessIds {
    #[serde(rename = "processIds")]
    process_ids: Vec<String>
}