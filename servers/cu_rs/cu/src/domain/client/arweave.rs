use arweave_rs::{Arweave, ArweaveBuilder};
use futures::{Future, FutureExt};
use reqwest::{header::{HeaderMap, HeaderValue}, Url};
use serde::{Deserialize, Serialize};
use std::{any::Any, path::PathBuf, pin::Pin};
use reqwest::Client;
use log::error;

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
    pub fn load_tx_meta_with<'a>(&'a self, gateway_url: String) -> impl FnOnce(String) -> Pin<Box<dyn Future<Output = Record> + 'a>> {
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

        let graphql = format!("{}{}", gateway_url, "/graphql");

        move |id: String| {
            async move {
                let mut headers = HeaderMap::new();
                headers.append("Content-Type", HeaderValue::from_str("application/json").unwrap());
                let body = serde_json::to_string(&GraphqlQuery {
                    query: GET_PROCESSES_QUERY.to_string(),
                    variables: ProcessIds {
                        process_ids: vec![id.clone()]
                    }
                });
                let result = self.client.post(graphql.clone())
                    .headers(headers)
                    .body(body.unwrap())
                    .send()
                    .await;
                match result {
                    Ok(res) => {
                        let json = res.json::<TransactionConnectionSchema>().await.unwrap();
                        json.data.edges[0].node.clone()
                    },
                    Err(e) => {
                        error!("Error Encountered when fetching transaction {} from gateway {}", id, graphql);
                        panic!("{:?}", e);
                    }
                }
            }
            .boxed()
        }
    }
}

#[derive(Deserialize)]
struct TransactionConnectionSchema {
    data: Transactions
}

#[derive(Deserialize)]
struct Transactions {
    edges: Vec<Edge>
}

#[derive(Deserialize)]
struct Edge {
    node: Record
}

#[derive(Deserialize, Clone)]
struct Record(String, String);

struct DataItem {
    id: String,
    data: Vec<u8>,
    tags: Vec<Tag>,
    anchor: String   
}

struct Tag {
    name: String,
    value: String
}

#[derive(Serialize)]
struct GraphqlQuery {
    query: String,
    variables: ProcessIds
}

#[derive(Serialize)]
struct ProcessIds {
    #[serde(rename = "processIds")]
    process_ids: Vec<String>
}