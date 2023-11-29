use std::time::{SystemTime, UNIX_EPOCH};
use std::{sync::Arc};

use sha2::{Digest, Sha256};
use hex;
use base64_url;
use jsonwebkey::{JsonWebKey, Key, ByteVec};

use super::dal::{Gateway, Wallet};
use super::bytes::DataItem;

#[derive(Debug, Clone)]
pub enum SequencerErrorType {
    SequencerError(String)
}

impl From<std::time::SystemTimeError> for SequencerErrorType {
    fn from(_error: std::time::SystemTimeError) -> Self {
        SequencerErrorType::SequencerError("Sequencer experienced an error obtaining system time".to_string())
    }
}

impl From<std::io::Error> for SequencerErrorType {
    fn from(_error: std::io::Error) -> Self {
        SequencerErrorType::SequencerError("Sequencer experienced an io error".to_string())
    }
}

impl From<serde_json::Error> for SequencerErrorType {
    fn from(_error: serde_json::Error) -> Self {
        SequencerErrorType::SequencerError("Sequencer experienced an error parsing json".to_string())
    }
}

impl From<base64_url::base64::DecodeError> for SequencerErrorType {
    fn from(_error: base64_url::base64::DecodeError) -> Self {
        SequencerErrorType::SequencerError("Sequencer experienced an error decoding ids".to_string())
    }
}

impl From<String> for SequencerErrorType {
    fn from(error: String) -> Self {
        SequencerErrorType::SequencerError(error)
    }
}

pub async fn gen_sort_key(data_item: &DataItem, gateway: Arc<dyn Gateway>, wallet: Arc<dyn Wallet>) -> Result<String, SequencerErrorType> {
    dotenv::dotenv().ok();

    let start_time = SystemTime::now();
    let duration = start_time.duration_since(UNIX_EPOCH)?;
    let millis = duration.as_secs() * 1000 + u64::from(duration.subsec_millis());
    let millis_string = millis.to_string();

    let network_info = gateway.network_info().await?;
    let height = network_info.height.clone();
    let current_block_id_base64 = network_info.current.clone();
    let current_block_id_bytes = base64_url::decode(&current_block_id_base64)?;

    let wallet_json = wallet.wallet_json()?;
    let jwk: JsonWebKey = serde_json::from_str(&wallet_json)?;
    let d_bytes = match &*jwk.key {
        Key::RSA { private: Some(rsa_private), .. } => {
            let d_value: &ByteVec = &rsa_private.d;
            d_value.to_vec()
        }
        _ => return Err(SequencerErrorType::SequencerError("Sequencer experienced a wallet error".to_string()))
    };

    let tx_id_base64 = data_item.id().clone();
    let tx_id_bytes = base64_url::decode(&tx_id_base64)?;

    let concatenated: Vec<u8> = concat_buffers(
        vec![
            current_block_id_bytes,
            tx_id_bytes,
            d_bytes
        ]
    );
    let hashed = hash(&concatenated);
    let hex_hash = hex::encode(hashed);

    let sort_key = format!("{},{},{}", height, millis_string, hex_hash);

    Ok(sort_key)
}

fn concat_buffers(buffers: Vec<Vec<u8>>) -> Vec<u8> {
    let total_length: usize = buffers.iter().map(|buffer| buffer.len()).sum();
    let mut temp = Vec::with_capacity(total_length);

    for buffer in &buffers {
        temp.extend_from_slice(buffer);
    }

    temp
}

pub fn hash(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    result.to_vec()
}