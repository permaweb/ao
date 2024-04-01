use arweave_rs::{Arweave, ArweaveBuilder};
use futures::{Future, FutureExt};
use reqwest::{header::{HeaderMap, HeaderValue}, Url};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, pin::Pin};
use reqwest::{Response, Client};
use log::error;
use crate::env_vars::{get_gateway_url, get_upload_url};

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
            .base_url(Url::parse("arweave.net").unwrap())
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
    pub fn load_tx_meta_with<'a>(&'a self) -> impl FnOnce(String) -> Pin<Box<dyn Future<Output = Record> + 'a>> {
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

        move |id: String| {
            let graphql = format!("{}{}", get_gateway_url(), "/graphql");
            async move {
                let result = self.client.post(graphql)
                    .headers(get_content_type_headers())
                    .body(serde_json::to_string(&GraphqlQuery {
                        query: GET_PROCESSES_QUERY.to_string(),
                        variables: ProcessIds {
                            process_ids: vec![id.clone()]
                        }
                    }).unwrap())
                    .send()
                    .await;
                match result {
                    Ok(res) => {
                        let json = res.json::<TransactionConnectionSchema>().await.unwrap();
                        json.data.edges[0].node.clone() // todo: should get the actual schema for the node
                    },
                    Err(e) => {
                        error!("Error Encountered when fetching transaction {} from gateway {}", id, get_gateway_url());
                        panic!("{:?}", e);
                    }
                }
            }
            .boxed()
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
    pub fn load_tx_data_with<'a>(&'a self) -> impl FnOnce(String) -> Pin<Box<dyn Future<Output = Response> + 'a>> {
        move |id: String| {
            async move {
                let result = self.client.get(format!("{}/raw/{}", get_gateway_url(), id)).send().await;
                match result {
                    Ok(res) => res,
                    Err(e) => {
                        error!("Error Encountered when fetching raw data for transaction {} from gateway {}", id, get_gateway_url());
                        panic!("{:?}", e);
                    }
                }
            }
            .boxed()
        }
    }

    pub fn query_gateway_with<'a, T: Serialize + Send + 'a>(&'a self) -> impl FnOnce(String, T) -> Pin<Box<dyn Future<Output = TransactionConnectionSchema> + 'a>> {        
        move |query: String, variables: T| {
            async move {
                let result = self.client.post(format!("{}{}", get_gateway_url(), "/graphql"))
                    .headers(get_content_type_headers())
                    .body(serde_json::to_string(&GraphqlQuery {
                        query,
                        variables
                    }).unwrap())
                    .send()
                    .await;

                match result {
                    Ok(res) => res.json::<TransactionConnectionSchema>().await.unwrap(),
                    Err(e) => {
                        error!("Error Encountered when querying gateway");
                        panic!("{:?}", e);
                    }
                }
            }
            .boxed()
        }
    }

    pub fn upload_data_item_with<'a>(&'a self) -> impl FnOnce(DataItem) -> Pin<Box<dyn Future<Output = TransactionConnectionSchema> + 'a>>{
        move |data_item: DataItem| {
            async move {
                let result = self.client
                    .post(format!("{}/tx/arweave", get_upload_url()))
                    .headers(get_content_type_headers())
                    .body(serde_json::to_string(&data_item).unwrap())
                    .send()
                    .await;

                match result {
                    Ok(res) => res.json::<TransactionConnectionSchema>().await.unwrap(),
                    Err(e) => {
                        error!("Error while communicating with uploader:");
                        panic!("{:?}", e);
                    }
                }
            }
            .boxed()
        }
    }
}

fn get_content_type_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.append("Content-Type", HeaderValue::from_str("application/json").unwrap());
    headers
}

#[derive(Deserialize)]
pub struct TransactionConnectionSchema {
    pub data: Transactions
}

#[derive(Deserialize)]
pub struct Transactions {
    pub edges: Vec<Edge>
}

#[derive(Deserialize)]
pub struct Edge {
    pub node: Record
}

#[derive(Deserialize, Clone)]
pub struct Record(pub String, pub String);

#[derive(Serialize)]
pub struct DataItem {
    pub id: String,
    pub data: Vec<u8>,
    pub tags: Vec<Tag>,
    pub anchor: String   
}

#[derive(Serialize)]
pub struct Tag {
    pub name: String,
    pub value: String
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