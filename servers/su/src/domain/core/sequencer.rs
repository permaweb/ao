use std::time::{SystemTime, UNIX_EPOCH};
use std::fs::File;
use std::io::Read;
use std::env;

use sha2::{Digest, Sha256};

use hex;

use reqwest::{Url};

use base64_url;

use arweave_rs::network::NetworkInfoClient;

use jsonwebkey::{JsonWebKey, RsaPrivate, Key, ByteVec};

use super::binary::DataItem;
use super::error::CoreError;

impl From<std::time::SystemTimeError> for CoreError {
    fn from(error: std::time::SystemTimeError) -> Self {
        CoreError::SequencerError("Sequencer experienced an error obtaining system time".to_string())
    }
}

impl From<arweave_rs::network::ResponseError> for CoreError {
    fn from(error: arweave_rs::network::ResponseError) -> Self {
        CoreError::SequencerError("Sequencer experienced an error obtaining network info".to_string())
    }
}

impl From<std::io::Error> for CoreError {
    fn from(error: std::io::Error) -> Self {
        CoreError::SequencerError("Sequencer experienced an io error".to_string())
    }
}

impl From<serde_json::Error> for CoreError {
    fn from(error: serde_json::Error) -> Self {
        CoreError::SequencerError("Sequencer experienced an error parsing json".to_string())
    }
}

impl From<base64_url::base64::DecodeError> for CoreError {
    fn from(error: base64_url::base64::DecodeError) -> Self {
        CoreError::SequencerError("Sequencer experienced an error decoding ids".to_string())
    }
}

pub async fn gen_sort_key(data_item: &DataItem) -> Result<String, CoreError> {
    dotenv::dotenv().ok();

    let start_time = SystemTime::now();
    let duration = start_time.duration_since(UNIX_EPOCH)?;
    let millis = duration.as_secs() * 1000 + u64::from(duration.subsec_millis());
    let millis_string = millis.to_string();

    let gateway_url = "https://arweave.net".to_string();
    let url = Url::parse(&gateway_url).unwrap();

    let network_client = NetworkInfoClient::new(url);
    let network_info = network_client.network_info().await?;

    let file_path = env::var("SU_WALLET_PATH")
        .expect("SU_WALLET_PATH environment variable not found");
    let mut file = File::open(&file_path)?;
    let mut key_json = String::new();
    file.read_to_string(&mut key_json)?;
    let jwk: JsonWebKey = serde_json::from_str(&key_json)?;
    let d_bytes = match &*jwk.key {
        Key::RSA { private: Some(rsa_private), .. } => {
            let d_value: &ByteVec = &rsa_private.d;
            d_value.to_vec()
        }
        _ => return Err(CoreError::SequencerError("Sequencer experienced a wallet error".to_string()))
    };

    let height = network_info.height.clone();
    let height_string = format!("{:0>12}", height);

    let tx_id_base64 = data_item.id().clone();
    let tx_id_bytes = base64_url::decode(&tx_id_base64)?;

    let current_block_id_base64 = network_info.current.to_string();
    let current_block_id_bytes = base64_url::decode(&current_block_id_base64)?;

    let concatenated: Vec<u8> = concat_buffers(
        vec![
            current_block_id_bytes,
            tx_id_bytes,
            d_bytes
        ]
    );
    let hashed = hash(&concatenated);
    let hex_hash = hex::encode(hashed);

    let sort_key = format!("{},{},{}", height_string, millis_string, hex_hash);

    Ok(sort_key)
}

fn concat_buffers(buffers: Vec<Vec<u8>>) -> Vec<u8> {
    let total_length: usize = buffers.iter().map(|buffer| buffer.len()).sum();
    let mut temp = Vec::with_capacity(total_length);
    let mut offset = 0;

    for buffer in &buffers {
        temp.extend_from_slice(buffer);
        offset += buffer.len();
    }

    temp
}

pub fn hash(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    result.to_vec()
}