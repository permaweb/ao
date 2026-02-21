use std::sync::Arc;
use std::io;

use reqwest::{Client, Url};

extern crate serde;
use serde::{Deserialize, Serialize};

use tokio::spawn;
use tokio::time::{sleep, Duration};

use crate::domain::core::dal::{Uploader, UploaderErrorType};
use crate::domain::bytes;
use crate::domain::Log;

use crate::domain::clients::store::StoreClient;
use crate::domain::clients::local_store::store::LocalStoreClient;
use crate::domain::config::AoConfig;
use crate::domain::core::dal::{DataStore, Gateway};
use crate::domain::clients::gateway::ArweaveGateway;
use crate::domain::SuLog;

pub struct UploaderClient {
    node_url: Url,
    cache_url: Url,
    logger: Arc<dyn Log>,
}

#[derive(Debug, Deserialize, Serialize)]
struct IrysResponse {
    id: String,
    timestamp: u64,
    version: String,
    public: String,
    signature: String,
}

impl From<reqwest::Error> for UploaderErrorType {
    fn from(error: reqwest::Error) -> Self {
        UploaderErrorType::UploadError(format!("Request error: {}", error))
    }
}

impl From<serde_json::Error> for UploaderErrorType {
    fn from(error: serde_json::Error) -> Self {
        UploaderErrorType::UploadError(format!("Request error: {}", error))
    }
}

impl UploaderClient {
    pub fn new(node_url: &str, cache_url: &str, logger: Arc<dyn Log>) -> Result<Self, UploaderErrorType> {
        let url = match Url::parse(node_url) {
            Ok(u) => u,
            Err(e) => return Err(UploaderErrorType::UploadError(format!("{}", e))),
        };

        let cache_url_in = match Url::parse(cache_url) {
            Ok(u) => u,
            Err(e) => return Err(UploaderErrorType::UploadError(format!("{}", e))),
        };

        Ok(UploaderClient {
            node_url: url,
            cache_url: cache_url_in,
            logger,
        })
    }
}

impl Uploader for UploaderClient {
    fn upload(&self, tx: Vec<u8>) -> Result<(), UploaderErrorType> {
        let node_url_clone = self.node_url.clone();
        let tx_clone = tx.clone();
        let logger_clone = Arc::clone(&self.logger);

        let node_url_for_cache = self.cache_url.clone();
        let tx_for_cache = tx.clone();
        let logger_for_cache = Arc::clone(&self.logger);

        spawn(async move {
            let client = Client::new();
            let mut delay = Duration::from_secs(1);
            let max_delay = Duration::from_secs(32);

            for attempt in 0..100 {
                let response = client
                    .post(
                        node_url_clone
                            .join(&format!("tx/{}", "arweave".to_string()))
                            .expect("Failed to join URL"),
                    )
                    .header("Content-Type", "application/octet-stream")
                    .body(tx_clone.clone())
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        logger_clone.log("Upload successful".to_string());
                        break;
                    }
                    Ok(resp) => {
                        logger_clone.error(format!("Non-success status: {}", resp.status()));
                    }
                    Err(e) => {
                        logger_clone.error(format!("Request error: {}", e));
                    }
                }

                // Exponential backoff logic
                logger_clone.log(format!(
                    "Attempt {} failed, retrying in {:?}",
                    attempt + 1,
                    delay
                ));
                sleep(delay).await;

                // Double the delay for the next attempt, but don't exceed the max delay
                delay = (delay * 2).min(max_delay);
            }
        });

        spawn(async move {
            let client = match reqwest::Client::builder()
              .http1_only()             
              .use_rustls_tls()
              .build() {
                Ok(c) => c,
                Err(e) => {
                    logger_for_cache.error(
                      format!("Cache upload failed to build client: {}", e)
                    );
                    return;
                }
              };

            let mut delay = Duration::from_secs(1);
            let max_delay = Duration::from_secs(32);

            let bundle_item = match bytes::DataItem::from_bytes(tx_for_cache.clone()) {
                Ok(item) => item,
                Err(e) => {
                    logger_for_cache.error(
                      format!("Cache upload failed to parse bundle item: {:?}", e)
                    );
                    return;
                }
            };

            let bundle_bytes = match bundle_item.data_bytes() {
                Some(bytes) => bytes,
                None => {
                    logger_for_cache.error(
                      "Cache upload failed bundle item has no data bytes".to_string()
                    );
                    return;
                }
            };

            let bundle = match bytes::DataBundle::from_bytes(&bundle_bytes) {
                Ok(bundle) => bundle,
                Err(e) => {
                    logger_for_cache.error(format!("Cache upload failed to parse data bundle: {:?}", e));
                    return;
                }
            };

            let target_item = match bundle.items
                .into_iter()
                .find(|item| {
                    item.tags().iter().any(|tag| {
                        tag.name == "Type" && (tag.value == "Process")
                    })
                }) {
                  Some(item) => item,
                  None => {
                      logger_for_cache.log(
                        "Cache upload skipping, not a Process"
                        .to_string()
                      );
                      return;
                  }
            };

            let tx_for_cache_parsed = match target_item.as_bytes() {
                Ok(bytes) => bytes,
                Err(e) => {
                    logger_for_cache.error(format!(
                      "Cache upload failed to convert item to bytes: {:?}", e
                    ));
                    return;
                }
            };

            let url = match node_url_for_cache.join(
              "/~arweave@2.9-pre/tx?codec-device=ans104@1.0"
            ) {
                Ok(url) => url,
                Err(e) => {
                    logger_for_cache.error(format!(
                      "Cache upload failed to join URL: {}", e
                    ));
                    return;
                }
            };

            for attempt in 0..1 {
                let response = client
                    .post(url.clone())
                    .body(tx_for_cache_parsed.clone())
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        logger_for_cache.log("Cache upload successful".to_string());
                        break;
                    }
                    Ok(resp) => {
                        logger_for_cache.error(format!("
                          Cache upload non-success status: {}", resp.status()
                        ));
                    }
                    Err(e) => {
                        logger_for_cache.error(format!("Cache upload request error: {}", e));
                    }
                }

                // Exponential backoff logic
                logger_for_cache.log(format!(
                    "Cache attempt {} failed, retrying in {:?}",
                    attempt + 1,
                    delay
                ));
                sleep(delay).await;

                // Double the delay for the next attempt, but don't exceed the max delay
                delay = (delay * 2).min(max_delay);
            }
        });

        Ok(())
    }
}

pub async fn reupload_bundles(pids: String, since: String, delay: u64) -> io::Result<()> {
    let config = AoConfig::new(None).expect("Failed to read configuration");
    let gateway: Arc<dyn Gateway> = Arc::new(
        ArweaveGateway::new().await.expect("Failed to init the gateway")
    );
    let logger = SuLog::init();
    let uploader = UploaderClient::new(
        &config.upload_node_url, &config.cache_url, logger.clone()
    ).unwrap();

    let data_store: Arc<dyn DataStore> = if config.use_local_store == false {
        Arc::new(StoreClient::new_single_connection()
            .expect("Failed to create StoreClient"))
    } else {
        Arc::new(LocalStoreClient::new_read_only(
            &config.su_file_db_dir, 
            &config.su_index_db_dir
        ).expect("Failed to create LocalStoreClient"))
    };

    for pid in pids.split(',') {
      let p = pid.to_string();
      let assignments = data_store.assignments_since(&p, &since, 5000000).await.unwrap();
      logger.log(format!("processing pid {}", pid));

      for assignment in assignments {
        sleep(Duration::from_millis(delay)).await;
        let gateway_tx = gateway.gql_tx(&assignment).await;
        match gateway_tx {
            Ok(_) => {
                logger.log(format!("Assignment found, skipping {}", assignment));
            },
            Err(e) => {
                if e == "Transaction not found" {
                    logger.log(format!("Assignment not found, reuploading {}", assignment));
                    let bundle = data_store.get_bundle_by_assignment(&assignment, &pid).unwrap();
                    uploader.upload(bundle).unwrap();
                } else {
                    logger.log(format!("Error fetching tx {}: {}", assignment, e));
                }
            }
        }
      }
    }

    return Ok(())
}