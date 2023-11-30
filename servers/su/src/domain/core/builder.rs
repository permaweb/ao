use std::{sync::Arc};

use bundlr_sdk::{tags::Tag};

use super::bytes::{DataBundle, DataItem, ByteErrorType};
use super::sequencer::{gen_sort_key, SequencerErrorType};
use super::verifier::{Verifier, VerifyErrorType};
use super::dal::{Gateway, Wallet, Signer};

pub struct Builder {
    verifier: Verifier,
    gateway: Arc<dyn Gateway>,
    wallet: Arc<dyn Wallet>,
    signer: Arc<dyn Signer>
}

pub struct BuildResult{
    pub binary: Vec<u8>,
    pub bundle: DataBundle
}

#[derive(Debug)]
pub enum BuilderErrorType {
    BuilderError(String)
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

impl From<BuilderErrorType> for String {
    fn from(error: BuilderErrorType) -> Self {
        format!("error in builder: {:?}", error)
    }
}

impl From<String> for BuilderErrorType {
    fn from(error: String) -> Self {
        BuilderErrorType::BuilderError(error)
    }
}

impl Builder {
    pub fn new(
        gateway: Arc<dyn Gateway>, 
        wallet: Arc<dyn Wallet>,
        signer: Arc<dyn Signer>
    ) -> Result<Self, BuilderErrorType> {
        let verifier = Verifier::new(Arc::clone(&gateway));

        Ok(Builder {
            verifier,
            gateway,
            wallet,
            signer
        })
    }

    pub async fn build(&self, tx: Vec<u8>) -> Result<BuildResult, BuilderErrorType> {
        let item = DataItem::from_bytes(tx)?;

        self.verifier.verify_data_item(&item).await?;

        let sort_key = gen_sort_key(&item, self.gateway.clone(), self.wallet.clone()).await?;
        let mut data_bundle = DataBundle::new(sort_key.clone());
        data_bundle.add_item(item);
        let buffer = data_bundle.to_bytes()?;
        let process_id = data_bundle.items[0].target().clone();

        let tags = vec![
            Tag::new(&"Bundle-Format".to_string(), &"binary".to_string()),
            Tag::new(&"Bundle-Version".to_string(), &"2.0.0".to_string()),
            Tag::new(&"Sequencer-Sort-Key".to_string(), &sort_key),
            Tag::new(&"Sequencer-Id".to_string(), &"ao-su-1".to_string()),
            Tag::new(&"Ao-Process-Id".to_string(), &process_id),
        ];

        let pub_key = self.signer.get_public_key();
        let mut new_data_item = DataItem::new(vec![], buffer, tags, pub_key)?;
        let message = new_data_item.get_message()?.to_vec();

        let signature = self.signer
            .sign_tx(message).await?;

        new_data_item.signature = signature;

        Ok(BuildResult{
            binary: new_data_item.as_bytes()?,
            bundle: data_bundle
        })
    }
}