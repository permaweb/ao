use std::{sync::Arc};

use bundlr_sdk::{tags::Tag};

use super::bytes::{DataBundle, DataItem, ByteErrorType};
use super::sequencer::{gen_sort_key, SequencerErrorType};
use super::verifier::{Verifier, VerifyErrorType};
use super::dal::{Gateway, Wallet, Signer, Log};

pub struct Builder<'a> {
    verifier: Verifier,
    gateway: Arc<dyn Gateway>,
    wallet: Arc<dyn Wallet>,
    signer: Arc<dyn Signer>,
    logger: &'a Arc<dyn Log>,
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

impl<'a> Builder<'a> {
    pub fn new(
        gateway: Arc<dyn Gateway>, 
        wallet: Arc<dyn Wallet>,
        signer: Arc<dyn Signer>,
        logger: &'a Arc<dyn Log>,
    ) -> Result<Self, BuilderErrorType> {
        let verifier = Verifier::new(Arc::clone(&gateway));

        Ok(Builder {
            verifier,
            gateway,
            wallet,
            signer,
            logger
        })
    }

    pub async fn build(&self, tx: Vec<u8>) -> Result<BuildResult, BuilderErrorType> {
        let item = DataItem::from_bytes(tx)?;
        self.logger.log(format!("attempting to verify data item id - {}", &item.id()));
        self.logger.log(format!("owner - {}", &item.owner()));
        self.logger.log(format!("target - {}", &item.target()));
        self.logger.log(format!("tags - {:?}", &item.tags()));
        self.verifier.verify_data_item(&item).await?;
        self.logger.log(format!("verified data item id - {}", &item.id()));

        let sort_key = gen_sort_key(&item, self.gateway.clone(), self.wallet.clone()).await?;
        let mut data_bundle = DataBundle::new(sort_key.clone());
        data_bundle.add_item(item);
        let buffer = data_bundle.to_bytes()?;
        self.logger.log(format!("generated sort key and created bundle, sort_key - {}", &sort_key));

        let process_id = data_bundle.items[0].target().clone();

        let tags = vec![
            Tag::new(&"Bundle-Format".to_string(), &"binary".to_string()),
            Tag::new(&"Bundle-Version".to_string(), &"2.0.0".to_string()),
            Tag::new(&"Sequencer-Sort-Key".to_string(), &sort_key),
            Tag::new(&"Sequencer-Id".to_string(), &"ao-su-1".to_string()),
            Tag::new(&"Ao-Process-Id".to_string(), &process_id),
        ];

        self.logger.log(format!("generated tags - {:?}", &tags));

        let pub_key = self.signer.get_public_key();
        let mut new_data_item = DataItem::new(vec![], buffer, tags, pub_key)?;
        let message = new_data_item.get_message()?.to_vec();

        let signature = self.signer
            .sign_tx(message).await?;

        new_data_item.signature = signature;

        self.logger.log(format!("signature succeeded {}", ""));

        Ok(BuildResult{
            binary: new_data_item.as_bytes()?,
            bundle: data_bundle
        })
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;
    use std::sync::Arc;
    use crate::domain::core::dal::NetworkInfo;

    struct MockGateway;
    #[async_trait]
    impl Gateway for MockGateway {
        async fn check_head(&self, _tx_id: String) -> Result<bool, String> {
            Ok(true)
        }

        async fn network_info(&self) -> Result<NetworkInfo, String> {
            Ok(NetworkInfo { 
                height: "1000".to_string(), 
                current: "test-network".to_string() 
            })
        }
    }

    struct MockWallet;
    impl Wallet for MockWallet {
        fn wallet_json(&self) -> Result<String, String> {
            let jwk = r#"{
                "kty": "RSA",
                "e": "AQAB",
                "n": "asdf",
                "d": "adsf",
                "p": "asdf",
                "q": "asdf",
                "dp": "adsf",
                "dq": "adsf",
                "qi": "asdf"
            }"#;

            Ok(jwk.to_string())
        }
    }

    struct MockSigner;
    #[async_trait]
    impl Signer for MockSigner {
        async fn sign_tx(&self, _buffer: Vec<u8>) -> Result<Vec<u8>, String> {
            Ok(vec![1, 2, 3, 4]) 
        }

        fn get_public_key(&self) -> Vec<u8> {
            vec![5, 6, 7, 8]
        }
    }

    #[tokio::test]
    async fn test_build_success() {
        let gateway = Arc::new(MockGateway);
        let wallet = Arc::new(MockWallet);
        let signer = Arc::new(MockSigner);

        let builder = Builder::new(gateway, wallet, signer)
            .expect("Failed to create Builder");

        let tx = base64_url::decode(&"AQB9q2yhsQlBHv2LOTIrtmKjw063S1DG0prKcq86DykIegmPnXOReXkWXwpqXt4YxTRw6Rw1jG7f1QFF5ReoJO2MrJmia9ymkTmnhamv3lsYYIotBC6U4Bmzo6IZiKmn2llJt0MDvCe8rxzG15vvff9bpnDIVflY_Dm9Y0dCH-w2Xg8rb2xLq-cM8SBoNRiYruwcwpahiHTjXcxboJKksZRXaI_E7_7vL1gWlMLqeYeF_uXqkth8_PGtZcqMA7pbTYcRzGki_rifGXKUIZKgSIRXTk54iboiqNzOklIFpDKDJpC9Xk_6ppSw_Xzs8S0KpR-veBL8TeURtGhrsDecu_36Pk2MMvdZedxiAg7bvQ9H_NZecoZcju-sQKZiE7haq9Nos3g6njh9IpXivGJ1k8tRLeox7hXOeynffzcXz1Vnz5c4Zxw8LKUbLygni49sflKyFTMnQ8sgDw00fPsuhrznq37-2OLhmYe-tIg-TEV3T4VNdqchzeRSFIv_l7ZJcxeFxcEgdq9aXMx2yzVhSInFuk_W8fJSbhPKX9cewbr4BA_XUNMReowLVcnjB_19iCWnivkVk9sz-QRbjuVL2IMqZePWcRdN5ncXRJoYv4F-Z4FfXDCFuyCD4UAtiQfdch-S4KvRf99DwKrZrMIF28MDdRFdE3ZGDs3FXcPuN8eMLoKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAfqDPAmIG6rEXKSN7RP3KRjN5IA5Wpp2I0hgOJ6bT2qNAAUAAAAAAAAASAAAAAAAAAAKGkRhdGEtUHJvdG9jb2wEYW8QZnVuY3Rpb24GcmF3GkRhdGEtUHJvdG9jb2wEYW8OYW8tdHlwZQ5tZXNzYWdlBlNESwRhbwA2NTgz".to_string()).expect("failed to encode data item");

        let result = builder.build(tx).await;

        assert!(result.is_ok());
    }
}
