use std::clone::Clone;

use bytes::{BufMut, Bytes};

use bundlr_sdk::{error::BundlrError, tags::*};

use base64_url;
use sha2::{Digest, Sha256, Sha384};

use ring::rand::SecureRandom;

#[derive(Debug)]
pub enum ByteErrorType {
    ByteError(String),
}

impl From<BundlrError> for ByteErrorType {
    fn from(error: BundlrError) -> Self {
        ByteErrorType::ByteError(format!("Byte error: {}", error))
    }
}

impl From<&str> for ByteErrorType {
    fn from(error: &str) -> Self {
        ByteErrorType::ByteError(format!("Byte error: {}", error.to_string()))
    }
}

impl From<std::io::Error> for ByteErrorType {
    fn from(error: std::io::Error) -> Self {
        ByteErrorType::ByteError(format!("Byte error: {}", error))
    }
}

impl From<String> for ByteErrorType {
    fn from(error: String) -> Self {
        ByteErrorType::ByteError(format!("Byte error: {}", error))
    }
}

#[derive(Clone)]
pub struct DataBundle {
    pub items: Vec<DataItem>,
    pub tags: Vec<Tag>,
}

impl DataBundle {
    pub fn new(tags: Vec<Tag>) -> Self {
        DataBundle {
            items: Vec::new(),
            tags: tags,
        }
    }

    pub fn add_item(&mut self, item: DataItem) {
        self.items.push(item);
    }

    pub fn to_bytes(&self) -> Result<Vec<u8>, ByteErrorType> {
        let mut headers = vec![0u8; 64 * self.items.len()];
        let mut binaries = Vec::new();

        for (index, item) in self.items.iter().enumerate() {
            let id = item.raw_id();
            let mut header = Vec::with_capacity(64);

            header.extend_from_slice(&long_to_32_byte_array(item.as_bytes()?.len() as u64)?);
            header.extend_from_slice(&id);
            headers.splice(64 * index..64 * (index + 1), header.iter().cloned());
            binaries.extend_from_slice(&item.as_bytes()?);
        }

        let mut buffer = Vec::new();
        buffer.extend_from_slice(&long_to_32_byte_array(self.items.len() as u64)?);
        buffer.extend_from_slice(&headers);
        buffer.extend_from_slice(&binaries);

        Ok(buffer)
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self, ByteErrorType> {
        let mut offset = 0;

        // Read the first 32 bytes to get the length of items
        let first_32_bytes = &bytes[offset..offset + 32];
        offset += 32;

        let items_len = _32_byte_array_to_long(first_32_bytes)? as usize;

        let mut items = Vec::with_capacity(items_len);

        // Read headers
        let header_size = 64 * items_len;
        let headers = &bytes[offset..offset + header_size];
        offset += header_size;

        for i in 0..items_len {
            // Read the next 32 bytes to get the length of the item
            let item_len_bytes = &headers[64 * i..64 * i + 32];
            let item_len = _32_byte_array_to_long(item_len_bytes)? as usize;

            // Read the item bytes
            let item_bytes = &bytes[offset..offset + item_len];
            offset += item_len;

            // Create the DataItem from the item bytes
            let item = DataItem::from_bytes(item_bytes.to_vec())?;
            items.push(item);
        }

        Ok(Self {
            items,
            tags: Vec::new(), // Assuming tags are not used in to_bytes
        })
    }
}

fn long_to_n_byte_array(n: usize, long: u64) -> Result<Vec<u8>, ByteErrorType> {
    let mut byte_array = vec![0u8; n];
    let mut value = long;

    for index in 0..n {
        let byte = (value & 0xFF) as u8;
        byte_array[index] = byte;
        value >>= 8;
    }

    Ok(byte_array)
}

fn long_to_32_byte_array(value: u64) -> Result<Vec<u8>, ByteErrorType> {
    long_to_n_byte_array(32, value)
}

fn _32_byte_array_to_long(bytes: &[u8]) -> Result<u64, ByteErrorType> {
    if bytes.len() != 32 {
        return Err(ByteErrorType::ByteError(
            "Array length is not 32 bytes".to_string(),
        ));
    }

    // Assuming the value is stored in the first 8 bytes
    n_byte_array_to_long(&bytes[0..8])
}

fn n_byte_array_to_long(bytes: &[u8]) -> Result<u64, ByteErrorType> {
    if bytes.len() > 8 {
        return Err(ByteErrorType::ByteError(
            "Array length exceeds 8 bytes".to_string(),
        ));
    }

    let mut value = 0u64;
    for (i, &byte) in bytes.iter().enumerate() {
        value |= (byte as u64) << (i * 8);
    }

    Ok(value)
}

#[derive(Clone)]
enum Data {
    None,
    Bytes(Vec<u8>),
}

#[derive(Clone)]
pub struct DataItem {
    signature_type: SignerMap,
    pub signature: Vec<u8>,
    owner: Vec<u8>,
    target: Vec<u8>,
    anchor: Vec<u8>,
    tags: Vec<Tag>,
    data: Data,
}
#[derive(Clone)]
pub struct Config {
    pub sig_length: usize,
    pub pub_length: usize,
    pub sig_name: String,
}

#[derive(PartialEq, Clone)]
pub enum SignerMap {
    None = -1,
    Arweave = 1,
    Ed25519,
    Ethereum,
    Solana,
    InjectedAptos = 5,
    MultiAptos = 6,
    TypedEthereum = 7,
}

impl SignerMap {
    pub fn get_config(&self) -> Config {
        match self {
            SignerMap::Arweave => Config {
                sig_length: 512,
                pub_length: 512,
                sig_name: "arweave".to_owned(),
            },
            SignerMap::Ed25519 => Config {
                sig_length: 64,
                pub_length: 32,
                sig_name: "ed25519".to_owned(),
            },
            SignerMap::Ethereum => Config {
                sig_length: 65,
                pub_length: 65,
                sig_name: "ethereum".to_owned(),
            },
            SignerMap::Solana => Config {
                sig_length: 64,
                pub_length: 32,
                sig_name: "solana".to_owned(),
            },
            SignerMap::InjectedAptos => Config {
                sig_length: 64,
                pub_length: 32,
                sig_name: "injectedAptos".to_owned(),
            },
            SignerMap::MultiAptos => Config {
                sig_length: 64 * 32 + 4,
                pub_length: 32 * 32 + 1,
                sig_name: "multiAptos".to_owned(),
            },
            SignerMap::TypedEthereum => Config {
                sig_length: 65,
                pub_length: 42,
                sig_name: "typedEthereum".to_owned(),
            },
            _ => Config {
                sig_length: 0,
                pub_length: 0,
                sig_name: "none".to_owned(),
            },
        }
    }
}

impl SignerMap {
    pub fn as_u16(&self) -> u16 {
        match self {
            SignerMap::Arweave => 1,
            SignerMap::Ed25519 => 2,
            SignerMap::Ethereum => 3,
            SignerMap::Solana => 4,
            SignerMap::InjectedAptos => 5,
            SignerMap::MultiAptos => 6,
            SignerMap::TypedEthereum => 7,
            _ => u16::MAX,
        }
    }
}

impl From<u16> for SignerMap {
    fn from(t: u16) -> Self {
        match t {
            1 => SignerMap::Arweave,
            2 => SignerMap::Ed25519,
            3 => SignerMap::Ethereum,
            4 => SignerMap::Solana,
            5 => SignerMap::InjectedAptos,
            6 => SignerMap::MultiAptos,
            7 => SignerMap::TypedEthereum,
            _ => SignerMap::None,
        }
    }
}

pub const LIST_AS_BUFFER: &[u8] = "list".as_bytes();
pub const BLOB_AS_BUFFER: &[u8] = "blob".as_bytes();
pub const DATAITEM_AS_BUFFER: &[u8] = "dataitem".as_bytes();
pub const ONE_AS_BUFFER: &[u8] = "1".as_bytes();

pub enum DeepHashChunk {
    Chunk(Bytes),
    Chunks(Vec<DeepHashChunk>),
}

pub fn deep_hash_sync(chunk: DeepHashChunk) -> Result<Bytes, ByteErrorType> {
    match chunk {
        DeepHashChunk::Chunk(b) => {
            let tag = [BLOB_AS_BUFFER, b.len().to_string().as_bytes()].concat();
            let c = [sha384hash(tag.into()), sha384hash(b)].concat();
            Ok(Bytes::copy_from_slice(&sha384hash(c.into())))
        }
        DeepHashChunk::Chunks(chunks) => {
            let len = chunks.len() as f64;
            let tag = [LIST_AS_BUFFER, len.to_string().as_bytes()].concat();
            let acc = sha384hash(tag.into());
            deep_hash_chunks_sync(chunks, acc)
        }
    }
}

pub fn deep_hash_chunks_sync(
    mut chunks: Vec<DeepHashChunk>,
    acc: Bytes,
) -> Result<Bytes, ByteErrorType> {
    if chunks.is_empty() {
        return Ok(acc);
    };
    let acc = Bytes::copy_from_slice(&acc);
    let hash_pair = [acc, deep_hash_sync(chunks.remove(0))?].concat();
    let new_acc = sha384hash(hash_pair.into());
    deep_hash_chunks_sync(chunks, new_acc)
}

fn sha384hash(b: Bytes) -> Bytes {
    let mut hasher = Sha384::new();
    hasher.update(&b);
    Bytes::copy_from_slice(&hasher.finalize())
}

impl DataItem {
    pub fn new(
        target: Vec<u8>,
        data: Vec<u8>,
        tags: Vec<Tag>,
        owner: Vec<u8>,
    ) -> Result<Self, ByteErrorType> {
        let mut randoms: [u8; 32] = [0; 32];
        let sr = ring::rand::SystemRandom::new();
        match sr.fill(&mut randoms) {
            Ok(()) => (),
            Err(err) => return Err(ByteErrorType::ByteError(err.to_string())),
        }
        let anchor = randoms.to_vec();

        Ok(DataItem {
            signature_type: SignerMap::Arweave,
            signature: vec![],
            owner: owner,
            target,
            anchor,
            tags,
            data: Data::Bytes(data),
        })
    }

    pub fn get_message(&mut self) -> Result<Bytes, ByteErrorType> {
        let encoded_tags = if !self.tags.is_empty() {
            self.tags.encode()?
        } else {
            Bytes::default()
        };

        match &mut self.data {
            Data::None => Ok(Bytes::new()),
            Data::Bytes(data) => {
                let data_chunk = DeepHashChunk::Chunk(data.clone().into());
                let sig_type = &self.signature_type;
                let sig_type_bytes = sig_type.as_u16().to_string().as_bytes().to_vec();
                deep_hash_sync(DeepHashChunk::Chunks(vec![
                    DeepHashChunk::Chunk(DATAITEM_AS_BUFFER.into()),
                    DeepHashChunk::Chunk(ONE_AS_BUFFER.into()),
                    DeepHashChunk::Chunk(sig_type_bytes.to_vec().into()),
                    DeepHashChunk::Chunk(self.owner.to_vec().into()),
                    DeepHashChunk::Chunk(self.target.to_vec().into()),
                    DeepHashChunk::Chunk(self.anchor.to_vec().into()),
                    DeepHashChunk::Chunk(encoded_tags.clone()),
                    data_chunk,
                ]))
            }
        }
    }

    pub fn is_signed(&self) -> bool {
        !self.signature.is_empty() && self.signature_type != SignerMap::None
    }

    fn from_info_bytes(buffer: &[u8]) -> Result<(Self, usize), ByteErrorType> {
        if buffer.len() < 2 {
            return Err(ByteErrorType::ByteError(
                "Buffer too short for signature type".to_string(),
            ));
        }

        let sig_type_b = &buffer[0..2];
        let signature_type = u16::from_le_bytes(
            <[u8; 2]>::try_from(sig_type_b)
                .map_err(|err| ByteErrorType::ByteError(err.to_string()))?,
        );
        let signer = SignerMap::from(signature_type);

        let Config {
            pub_length,
            sig_length,
            ..
        } = signer.get_config();

        if buffer.len() < 2 + sig_length + pub_length {
            return Err(ByteErrorType::ByteError(
                "Buffer too short for signature and public key".to_string(),
            ));
        }

        let signature = &buffer[2..2 + sig_length];
        let owner = &buffer[2 + sig_length..2 + sig_length + pub_length];

        let target_start = 2 + sig_length + pub_length;
        let target_present = u8::from_le_bytes(
            <[u8; 1]>::try_from(&buffer[target_start..target_start + 1]).map_err(|err| {
                ByteErrorType::ByteError(format!("target bytes error - {}", err.to_string()))
            })?,
        );
        let target = match target_present {
            0 => &[],
            1 => &buffer[target_start + 1..target_start + 33],
            _b => return Err(ByteErrorType::ByteError("target bytes error".to_string())),
        };
        let anchor_start = target_start + 1 + target.len();
        let anchor_present = u8::from_le_bytes(
            <[u8; 1]>::try_from(&buffer[anchor_start..anchor_start + 1]).map_err(|err| {
                ByteErrorType::ByteError(format!("anchor bytes error - {}", err.to_string()))
            })?,
        );
        let anchor = match anchor_present {
            0 => &[],
            1 => &buffer[anchor_start + 1..anchor_start + 33],
            b => {
                return Err(ByteErrorType::ByteError(format!(
                    "anchor bytes error - {}",
                    b.to_string()
                )))
            }
        };

        let tags_start = anchor_start + 1 + anchor.len();
        let number_of_tags = u64::from_le_bytes(
            <[u8; 8]>::try_from(&buffer[tags_start..tags_start + 8]).map_err(|err| {
                ByteErrorType::ByteError(format!("tag bytes error - {}", err.to_string()))
            })?,
        );

        let number_of_tags_bytes = u64::from_le_bytes(
            <[u8; 8]>::try_from(&buffer[tags_start + 8..tags_start + 16]).map_err(|err| {
                ByteErrorType::ByteError(format!("tag bytes error - {}", err.to_string()))
            })?,
        );

        let mut b = buffer.to_vec();
        let mut tags_bytes =
            &mut b[tags_start + 16..tags_start + 16 + number_of_tags_bytes as usize];

        let tags = if number_of_tags_bytes > 0 {
            tags_bytes.decode()?
        } else {
            vec![]
        };

        if number_of_tags != tags.len() as u64 {
            return Err(ByteErrorType::ByteError("invalid tag encoding".to_string()));
        }

        let data_item = DataItem {
            signature_type: signer,
            signature: signature.to_vec(),
            owner: owner.to_vec(),
            target: target.to_vec(),
            anchor: anchor.to_vec(),
            tags,
            data: Data::None,
        };

        Ok((data_item, tags_start + 16 + number_of_tags_bytes as usize))
    }

    pub fn from_bytes(buffer: Vec<u8>) -> Result<Self, ByteErrorType> {
        let (bundlr_tx, data_start) = DataItem::from_info_bytes(&buffer)?;
        let data = &buffer[data_start..buffer.len()];

        Ok(DataItem {
            data: Data::Bytes(data.to_vec()),
            ..bundlr_tx
        })
    }

    pub fn as_bytes(&self) -> Result<Vec<u8>, ByteErrorType> {
       /* if !self.is_signed() {
            return Err(ByteErrorType::ByteError("no signature".to_string()));
        }*/
        let data = match &self.data {
            Data::None => return Err(ByteErrorType::ByteError("invalid data type".to_string())),
            Data::Bytes(data) => data,
        };

        let encoded_tags = if !self.tags.is_empty() {
            self.tags.encode()?
        } else {
            Bytes::default()
        };
        let config = self.signature_type.get_config();
        let length = 2u64
            + config.sig_length as u64
            + config.pub_length as u64
            + 34
            + 16
            + encoded_tags.len() as u64
            + data.len() as u64;

        let mut b = Vec::with_capacity(TryInto::<usize>::try_into(length).map_err(|err| {
            ByteErrorType::ByteError(format!("data length error - {} ", err.to_string()))
        })?);

        let sig_type: [u8; 2] = (self.signature_type.clone() as u16).to_le_bytes();
        let target_presence_byte = if self.target.is_empty() {
            &[0u8]
        } else {
            &[1u8]
        };
        let anchor_presence_byte = if self.anchor.is_empty() {
            &[0u8]
        } else {
            &[1u8]
        };
        b.put(&sig_type[..]);
        b.put(&self.signature[..]);
        b.put(&self.owner[..]);
        b.put(&target_presence_byte[..]);
        b.put(&self.target[..]);
        b.put(&anchor_presence_byte[..]);
        b.put(&self.anchor[..]);
        let number_of_tags = (self.tags.len() as u64).to_le_bytes();
        let number_of_tags_bytes = (encoded_tags.len() as u64).to_le_bytes();
        b.put(number_of_tags.as_slice());
        b.put(number_of_tags_bytes.as_slice());
        if !number_of_tags_bytes.is_empty() {
            b.put(encoded_tags);
        }

        b.put(&data[..]);
        Ok(b)
    }

    pub fn raw_id(&self) -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(&self.signature);
        hasher.finalize().to_vec()
    }

    pub fn id(&self) -> String {
        let raw_id = self.raw_id();
        base64_url::encode(&raw_id)
    }

    pub fn owner(&self) -> String {
        let owner_base64 = base64_url::encode(&self.owner);
        owner_base64
    }

    pub fn target(&self) -> String {
        let target_base64 = base64_url::encode(&self.target);
        target_base64
    }

    pub fn tags(&self) -> Vec<Tag> {
        self.tags.clone()
    }

    pub fn data(&self) -> Option<String> {
        match &self.data {
            Data::Bytes(d) => match String::from_utf8(d.clone()) {
                Ok(s) => Some(s),
                Err(_) => None,
            },
            Data::None => None,
        }
    }

    pub fn data_bytes(&self) -> Option<Vec<u8>> {
        match &self.data {
            Data::Bytes(d) => Some(d.clone()),
            Data::None => None,
        }
    }

    pub fn signature(&self) -> String {
        let sig_base64 = base64_url::encode(&self.signature);
        sig_base64
    }

    pub fn anchor(&self) -> String {
        match String::from_utf8(self.anchor.clone()) {
            Ok(s) => s,
            Err(_) => "".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ITEM_STR: &str = "AQB9q2yhsQlBHv2LOTIrtmKjw063S1DG0prKcq86DykIegmPnXOReXkWXwpqXt4YxTRw6Rw1jG7f1QFF5ReoJO2MrJmia9ymkTmnhamv3lsYYIotBC6U4Bmzo6IZiKmn2llJt0MDvCe8rxzG15vvff9bpnDIVflY_Dm9Y0dCH-w2Xg8rb2xLq-cM8SBoNRiYruwcwpahiHTjXcxboJKksZRXaI_E7_7vL1gWlMLqeYeF_uXqkth8_PGtZcqMA7pbTYcRzGki_rifGXKUIZKgSIRXTk54iboiqNzOklIFpDKDJpC9Xk_6ppSw_Xzs8S0KpR-veBL8TeURtGhrsDecu_36Pk2MMvdZedxiAg7bvQ9H_NZecoZcju-sQKZiE7haq9Nos3g6njh9IpXivGJ1k8tRLeox7hXOeynffzcXz1Vnz5c4Zxw8LKUbLygni49sflKyFTMnQ8sgDw00fPsuhrznq37-2OLhmYe-tIg-TEV3T4VNdqchzeRSFIv_l7ZJcxeFxcEgdq9aXMx2yzVhSInFuk_W8fJSbhPKX9cewbr4BA_XUNMReowLVcnjB_19iCWnivkVk9sz-QRbjuVL2IMqZePWcRdN5ncXRJoYv4F-Z4FfXDCFuyCD4UAtiQfdch-S4KvRf99DwKrZrMIF28MDdRFdE3ZGDs3FXcPuN8eMLoKBrkyfkM3J89W1GNvrcCNHSNzhF8oPItU4Qno7-x52ZIOAjfdFcXTYLQYU7Xfr6GKaRByemPrkbkrJpdB8RQREt3rQRDNGRQ0jnbPn62PQugvss98JZn9D4ScNusbbgKMihj4MqfXE2mt7Ab9ewx5d01d-Mwf3D6mGz_ERBJgJo8b119bRXdNvgUDJC58NFd4chEOUF4mbyj2pZB9P7fx22yEvV7y6DNzuKvk02YQt7TwL7sdxH1PT63CYJx0tlVGGDvJhGKUQwOfDaXHFMjuuUlXa_klTJT5wEb78aAyh33rw0n9wpOakTIk2KgekbJAzVWCT0BfLrrOhKs3556_d--2mLmcLOONosBjSLokuvtyrTOX7btKRf6Zl5l3wtxsFaPgO6M3Qy9UR46AtK76XSFQd9kcDf_Qj1FyronJS_enQFWYn5Um97mDnYT9SJwMpDFS_FYBTKlsNhsVy11EW5kKuo6mTRlfebJa9CQv-NzbUajd7ulAcM4VNWYt-KbbhVZtUUUxgDvXJdlwRSYR5U8JwSze3sfatb5mbds-EAS-tT7grwrvTb4wRz20e9ARtBg6kC_x8QujHmFORJ97zrFlnnunPbsWgwWz8bfT9RMFy5xUE1KDCtnJqp-M3FoWwQc4sREIyCl7Q6JTq_slPe-Xwt9C5oquj4e_SoOuTAfqDPAmIG6rEXKSN7RP3KRjN5IA5Wpp2I0hgOJ6bT2qNAAUAAAAAAAAASAAAAAAAAAAKGkRhdGEtUHJvdG9jb2wEYW8QZnVuY3Rpb24GcmF3GkRhdGEtUHJvdG9jb2wEYW8OYW8tdHlwZQ5tZXNzYWdlBlNESwRhbwA2NTgz";

    #[test]
    fn test_byte_conversion() {
        let d_item_string = ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let reconverted_string =
            base64_url::encode(&data_item.as_bytes().expect("failed to convert to bytes"));
        assert_eq!(d_item_string, reconverted_string);
    }

    #[test]
    fn test_fields() {
        let d_item_string = ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        assert_eq!(
            "6oYAxVAnH8yKsZKpMgHSbRv7uVWey68PAqYuSXeZBbg".to_string(),
            data_item.id()
        );
        assert_eq!("goGuTJ-Qzcnz1bUY2-twI0dI3OEXyg8i1ThCejv7HnZkg4CN90VxdNgtBhTtd-voYppEHJ6Y-uRuSsml0HxFBES3etBEM0ZFDSOds-frY9C6C-yz3wlmf0PhJw26xtuAoyKGPgyp9cTaa3sBv17DHl3TV34zB_cPqYbP8REEmAmjxvXX1tFd02-BQMkLnw0V3hyEQ5QXiZvKPalkH0_t_HbbIS9XvLoM3O4q-TTZhC3tPAvux3EfU9PrcJgnHS2VUYYO8mEYpRDA58NpccUyO65SVdr-SVMlPnARvvxoDKHfevDSf3Ck5qRMiTYqB6RskDNVYJPQF8uus6Eqzfnnr9377aYuZws442iwGNIuiS6-3KtM5ftu0pF_pmXmXfC3GwVo-A7ozdDL1RHjoC0rvpdIVB32RwN_9CPUXKuiclL96dAVZiflSb3uYOdhP1InAykMVL8VgFMqWw2GxXLXURbmQq6jqZNGV95slr0JC_43NtRqN3u6UBwzhU1Zi34ptuFVm1RRTGAO9cl2XBFJhHlTwnBLN7ex9q1vmZt2z4QBL61PuCvCu9NvjBHPbR70BG0GDqQL_HxC6MeYU5En3vOsWWee6c9uxaDBbPxt9P1EwXLnFQTUoMK2cmqn4zcWhbBBzixEQjIKXtDolOr-yU975fC30Lmiq6Ph79Kg65M".to_string(), data_item.owner());
        assert_eq!(
            "-oM8CYgbqsRcpI3tE_cpGM3kgDlamnYjSGA4nptPao0".to_string(),
            data_item.target()
        );
    }

    #[test]
    fn test_is_signed() {
        let d_item_string = ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        assert_eq!(data_item.is_signed(), true);
    }

    #[test]
    fn test_bundle() {
        let d_item_string = ITEM_STR.to_string();
        let item_bytes = base64_url::decode(&d_item_string).expect("failed to encode data item");
        let data_item = DataItem::from_bytes(item_bytes).expect("failed to build data item");
        let tags = vec![
            Tag::new(&"Bundle-Format".to_string(), &"binary".to_string()),
            Tag::new(&"Bundle-Version".to_string(), &"2.0.0".to_string()),
        ];
        let mut data_bundle = DataBundle::new(tags);
        data_bundle.add_item(data_item);
        assert_eq!(data_bundle.items.len(), 1);
        let bundle_bytes = data_bundle.to_bytes();
        assert!(bundle_bytes.is_ok(), "Bundling failed");
    }
}
