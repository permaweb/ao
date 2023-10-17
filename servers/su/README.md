

Run local dev server with hot reloading
cargo install systemfd cargo-watch
systemfd --no-pid -s http::8999 -- cargo watch -x run

cargo install diesel_cli --no-default-features --features postgres
diesel setup
diesel migration generate create_contracts
diesel migration generate create_messages

irys fund 4000000000000 -h https://node1.irys.xyz -t arweave -w suwallet.json
Loaded address: mx8zvkz0jWNwAiBnBqkGcZqqfcFYptbrL4RIKMd4anc
? Confirmation: send 4000000000000 winston (4 arweave) to node1.irys.xyz (OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs)?
 Y / N Y
Funding receipt:
Amount: 4000000000000 with Fee: 2564790 to OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs
Transaction ID: CLntGV7x9X33o96J1ebNHkPsMUkxL_ijfNsW0qo8Ml8



irys balance mx8zvkz0jWNwAiBnBqkGcZqqfcFYptbrL4RIKMd4anc -t arweave -h https://node1.irys.xyz


// modified code from bundlr-sdk
// impl ChunkUploader {
//     pub fn new(url: Url, client: reqwest::Client, currency: CurrencyType) -> Self {
//         ChunkUploader {
//             url,
//             client,
//             upload_id: None,
//             currency,
//             chunk_size: CHUNK_SIZE,
//         }
//     }

//     pub async fn upload(&mut self, _data: Vec<u8>) -> Result<(), BundlrError> {
//         let (max, min) = if let Some(upload_id) = self.upload_id.clone() {
//             let url = self
//                 .url
//                 .join(&format!("/chunks/{}/{}/-1", self.currency, upload_id))
//                 .map_err(|err| BundlrError::ParseError(err.to_string()))?;
//             let res = self
//                 .client
//                 .get(url)
//                 .header("x-chunking-version", "2")
//                 .send()
//                 .await
//                 .map_err(|err| BundlrError::UploadError(err.to_string()))?
//                 .json::<IdRes>()
//                 .await
//                 .map_err(|err| BundlrError::ParseError(err.to_string()))?;

//             (res.max, res.min)
//         } else {
//             let url = self
//                 .url
//                 .join(&format!("/chunks/{}/-1/-1", self.currency))
//                 .map_err(|err| BundlrError::ParseError(err.to_string()))?;
//             let res = self
//                 .client
//                 .get(url)
//                 .header("x-chunking-version", "2")
//                 .send()
//                 .await
//                 .map_err(|err| BundlrError::UploadError(err.to_string()))?
//                 .json::<IdRes>()
//                 .await
//                 .map_err(|err| BundlrError::ParseError(err.to_string()))?;

//             self.upload_id = Some(res.id);

//             (res.max, res.min)
//         };

//         if self.chunk_size < min || self.chunk_size > max {
//             return Err(BundlrError::ChunkSizeOutOfRange(min, max));
//         }

//         Ok(())
//     }

//     pub async fn post_chunk_with_retries(
//         &self,
//         chunk: Vec<u8>,
//         offset: usize,
//         headers: Vec<(String, String)>,
//     ) -> Result<usize, BundlrError> {
//         let mut retries = 0;
//         let mut resp = self.post_chunk(&chunk, offset, headers.clone()).await;

//         while retries < CHUNKS_RETRIES {
//             match resp {
//                 Ok(offset) => return Ok(offset),
//                 Err(e) => {
//                     dbg!("post_chunk_with_retries: {:?}", e);
//                     sleep(Duration::from_secs(CHUNKS_RETRY_SLEEP));
//                     retries += 1;
//                     resp = self.post_chunk(&chunk, offset, headers.clone()).await;
//                 }
//             }
//         }
//         resp
//     }

//     pub async fn post_chunk(
//         &self,
//         chunk: &[u8],
//         offset: usize,
//         headers: Vec<(String, String)>,
//     ) -> Result<usize, BundlrError> {
//         let upload_id = match &self.upload_id {
//             Some(id) => id,
//             None => return Err(BundlrError::UploadError("No upload id".to_string())),
//         };
//         let url = self
//             .url
//             .join(&format!(
//                 "/chunks/{}/{}/{}",
//                 self.currency, upload_id, offset
//             ))
//             .map_err(|err| BundlrError::ParseError(err.to_string()))?;

//         let mut req = self
//             .client
//             .post(url)
//             .json(&chunk)
//             .header(&ACCEPT, "application/json");
//         for (header, value) in headers {
//             req = req.header(header, value);
//         }

//         let res = req
//             .send()
//             .await
//             .map_err(|e| BundlrError::PostChunkError(e.to_string()))?;

//         match res.status() {
//             reqwest::StatusCode::OK => Ok(offset),
//             err => Err(BundlrError::RequestError(err.to_string())),
//         }
//     }
// }














use std::{env, path::PathBuf,  future::Future, sync::Arc, str::FromStr, thread::sleep, time::Duration};

use reqwest::{header::ACCEPT, Url, Client};

use arweave_rs::{ArweaveBuilder, crypto::base64::Base64, transaction::tags::{Tag, FromUtf8Strs}};

use super::super::core::{DataItem, DataBundle};


use super::super::bl::traits::{Builder, DepError, BuildResult};

pub struct ArweaveClient {
    arweave_url: Url,
    wallet: PathBuf
}

impl ArweaveClient {
    pub fn new(arweave_url: &str, wallet_path: &str) -> Self {
        let wallet = PathBuf::from_str(wallet_path)
            .expect("wallet file does not exist");

        let url = Url::parse(arweave_url).unwrap();

        ArweaveClient {
            arweave_url: url,
            wallet: wallet
        }
    }
}

impl Builder for ArweaveClient {
    // workaroud for async traits
    type BuildFuture = std::pin::Pin<Box<dyn Future<Output = Result<BuildResult, DepError>> + Send + 'static>>;

    fn build(&self, tx: Vec<u8>) -> Self::BuildFuture {
        let arweave_url_clone = self.arweave_url.clone();
        let wallet = self.wallet.clone();

        Box::pin(async move {
            let client = Client::new();

            let quantity: u128 = 0;
            let fee: u64 = 0;
            let auto_content_tag = false;
            let target = Base64(b"".to_vec());

            let mut other_tags = vec![
                Tag::from_utf8_strs("Bundle-Format", &"binary".to_string()).unwrap(),
                Tag::from_utf8_strs("Bundle-Version", &"2.0.0".to_string()).unwrap()
            ];

            let mut data_bundle = DataBundle::new();
            let item = DataItem::from_bytes(tx).unwrap();
            data_bundle.add_item(item);
            let buffer = data_bundle.to_bytes().unwrap();

            let arweave = ArweaveBuilder::new()
                .base_url(arweave_url_clone)
                .keypair_path(wallet)
                .build()
                .unwrap();

            let tx_build = arweave.create_transaction(
                target,
                other_tags,
                buffer,
                quantity,
                fee,
                auto_content_tag,
            ).await.unwrap();

            let signed_tx = arweave.sign_transaction(tx_build).unwrap();

            println!("{:?}", signed_tx);

            let serialized = bincode::serialize(&signed_tx).unwrap();

            return Ok(BuildResult(serialized))
        })
    }
}




use std::future::Future;

pub enum DepError {
    BuildError(String),
    UploadError(String),
    SaveTxError(String),
}

pub struct UploadResult(pub String);
pub struct BuildResult(pub Vec<u8>);
pub struct TransactionId(pub u64);  

// Traits for business logic dependencies

pub trait Uploader {
    // this is a workaround for for async traits, you cannot have async fn on a trait
    type UploadFuture: Future<Output = Result<UploadResult, DepError>>;
    fn upload(&self, tx: Vec<u8>) -> Self::UploadFuture;
}

pub trait Builder {
    // this is a workaround for for async traits, you cannot have async fn on a trait
    type BuildFuture: Future<Output = Result<BuildResult, DepError>>;
    fn build(&self, tx: Vec<u8>) -> Self::BuildFuture;
}

pub trait DataStore {
    fn save_tx(&self) -> Result<TransactionId, DepError>;
}
