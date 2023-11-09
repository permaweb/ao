use std::{path::PathBuf, sync::Arc};
use std::{str::FromStr};
use reqwest::{Url};
use bundlr_sdk::{bundlr::BundlrBuilder, currency::arweave::ArweaveBuilder, tags::Tag};

use super::bytes::{DataBundle, DataItem, ByteErrorType};
use super::sequencer::{gen_sort_key, SequencerErrorType};
use super::verifier::{Verifier, VerifyErrorType};

pub struct Builder {
    node_url: Url,
    wallet: PathBuf,
    verifier: Verifier,
}

pub struct BuildResult{
    pub binary: Vec<u8>,
    pub bundle: DataBundle
}

#[derive(Debug)]
pub enum BuilderErrorType {
    BuilderError(String)
}

impl From<bundlr_sdk::error::BuilderError> for BuilderErrorType {
    fn from(error: bundlr_sdk::error::BuilderError) -> Self {
        BuilderErrorType::BuilderError(format!("Conversion from BuilderError: {}", error))
    }
}

impl From<bundlr_sdk::error::BundlrError> for BuilderErrorType {
    fn from(error: bundlr_sdk::error::BundlrError) -> Self {
        BuilderErrorType::BuilderError(format!("Conversion from BundlrError: {}", error))
    }
}

impl From<SequencerErrorType> for BuilderErrorType {
    fn from(error: SequencerErrorType) -> Self {
        BuilderErrorType::BuilderError(format!("Sequencer error in builder: {:?}", error))
    }
}

impl From<ByteErrorType> for BuilderErrorType {
    fn from(error: ByteErrorType) -> Self {
        BuilderErrorType::BuilderError(format!("Byte error in builder: {:?}", error))
    }
}

impl From<VerifyErrorType> for BuilderErrorType {
    fn from(error: VerifyErrorType) -> Self {
        BuilderErrorType::BuilderError(format!("Verification error in builder: {:?}", error))
    }
}

impl Builder {
    pub fn new(node_url: &str, wallet_path: &str) -> Result<Self, BuilderErrorType> {
        let wallet = PathBuf::from_str(wallet_path)
            .expect("wallet file does not exist");

        let url = match Url::parse(node_url) {
            Ok(u) => u,
            Err(e) => return Err(BuilderErrorType::BuilderError(format!("builder error - {}", e.to_string())))
        };

        let verifier = Verifier::new();

        Ok(Builder {
            node_url: url,
            wallet,
            verifier
        })
    }

    pub async fn build(&self, tx: Vec<u8>) -> Result<BuildResult, BuilderErrorType> {
        let wallet_clone = Arc::new(self.wallet.clone());
        let url_clone = Arc::new(self.node_url.clone());
        
        let item = DataItem::from_bytes(tx)?;

        self.verifier.verify_data_item(&item).await?;

        let sort_key = gen_sort_key(&item).await?;
        let mut data_bundle = DataBundle::new(sort_key.clone());
        data_bundle.add_item(item);
        let buffer = data_bundle.to_bytes()?;
        let process_id = data_bundle.items[0].target().clone();

        let currency = ArweaveBuilder::new()
            .keypair_path(wallet_clone.to_path_buf()) // Convert Arc<PathBuf> to PathBuf
            .build()
            .expect("Could not create currency instance");

        let bundlr = BundlrBuilder::new()
            .url(url_clone.as_ref().clone()) // Convert Arc<Url> to Url
            .currency(currency)
            .fetch_pub_info()
            .await?
            .build()?;

        let tags = vec![
            Tag::new(&"Bundle-Format".to_string(), &"binary".to_string()),
            Tag::new(&"Bundle-Version".to_string(), &"2.0.0".to_string()),
            Tag::new(&"Sequencer-Sort-Key".to_string(), &sort_key),
            Tag::new(&"Sequencer-Id".to_string(), &"ao-su-1".to_string()),
            Tag::new(&"Ao-Process-Id".to_string(), &process_id),
        ];

        let mut bundlr_tx = bundlr
            .create_transaction(buffer, tags)?;

        bundlr.sign_transaction(&mut bundlr_tx).await?;

        Ok(BuildResult{
            binary: bundlr_tx.as_bytes()?,
            bundle: data_bundle
        })
    }
}