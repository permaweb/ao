use arweave_rs::ArweaveSigner as SdkSigner;
use async_trait::async_trait;
use bytes::Bytes;
use std::path::PathBuf;
use std::str::FromStr;

use crate::domain::core::dal::Signer;

pub struct ArweaveSigner {
    sdk: SdkSigner,
}

const PUB_LENGTH: u16 = 512;

impl ArweaveSigner {
    pub fn new(wallet_path: &str) -> Result<Self, String> {
        let wallet = PathBuf::from_str(wallet_path).expect("wallet file does not exist");
        let sdk = match SdkSigner::from_keypair_path(wallet) {
            Ok(s) => s,
            Err(e) => return Err(e.to_string()),
        };
        let pub_key = sdk.get_public_key().0;
        if pub_key.len() as u16 == PUB_LENGTH {
            Ok(Self { sdk })
        } else {
            Err("invalid wallet path".to_string())
        }
    }
}

#[async_trait]
impl Signer for ArweaveSigner {
    async fn sign_tx(&self, buffer: Vec<u8>) -> Result<Vec<u8>, String> {
        let as_bytes = Bytes::from(buffer);
        let signed = match self.sdk.sign(&as_bytes) {
            Ok(s) => s,
            Err(e) => return Err(e.to_string()),
        };
        Ok(Bytes::copy_from_slice(&signed.0).to_vec())
    }

    fn get_public_key(&self) -> Vec<u8> {
        Bytes::copy_from_slice(&self.sdk.get_public_key().0).to_vec()
    }
}
